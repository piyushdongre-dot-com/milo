

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(




  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

var main_exports = {};
__export(main_exports, {
  default: () => ExternalAttachmentsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");
var path2 = __toESM(require("path"));

var MILO_PRO_UPGRADE_URL = "https://dodo.pe/aq5yajoqmm7";

var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var IMG_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i;
var VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;
var AUDIO_EXT = /\.(mp3|wav|ogg|m4a|flac)$/i;
var PDF_EXT = /\.pdf$/i;
var MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  flac: "audio/flac",
  pdf: "application/pdf"
};
function mimeFor(basename2) {
  const ext = path.extname(basename2).slice(1).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}
function linkpathOf(src) {
  return src.split(/[#|]/)[0].trim();
}
var SIZE_RE = /^(\d+)(?:\s*[x×]\s*(\d+))?$/i;
function parseEmbedSize(...candidates) {
  for (const raw of candidates) {
    if (!raw) continue;
    const parts = raw.split("|");
    for (let i = parts.length - 1; i >= 0; i--) {
      const m = parts[i].trim().match(SIZE_RE);
      if (m) return m[2] ? { width: m[1], height: m[2] } : { width: m[1] };
    }
  }
  return null;
}
var MAX_DEPTH = 24;
var LINK_TYPE = process.platform === "win32" ? "junction" : "dir";
async function walk(dir, mountRoot, index, depth) {
  if (depth > MAX_DEPTH) return;
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, mountRoot, index, depth + 1);
    } else if (entry.isFile()) {
      const key = entry.name.toLowerCase();
      if (!index.has(key)) index.set(key, full);
    }
  }
}
async function buildIndex(mounts) {
  const index =  new Map();
  for (const mount of mounts) {
    const p = typeof mount === "string" ? mount : mount.path;
    if (!p) continue;
    await walk(p, p, index, 0);
  }
  return index;
}
var MountResolver = class {
  constructor(opts) {
    this.index = null;
    this.indexing = null;
    this.opts = opts;
  }
  setOptions(opts) {
    this.opts = opts;
    this.invalidate();
  }

  invalidate() {
    this.index = null;
    this.indexing = null;
  }
  get active() {
    return this.opts.mounts.some((m) => {
      const p = typeof m === "string" ? m : m.path;
      return p && p.length > 0;
    });
  }

  async resolve(basename2) {
    var _a;
    for (const mount of this.opts.mounts) {
      const p = typeof mount === "string" ? mount : mount.path;
      if (!p) continue;
      const direct = path.join(p, basename2);
      try {
        const stat = await fs.promises.stat(direct);
        if (stat.isFile()) return direct;
      } catch (e) {
      }
    }
    if (this.opts.recursive) {
      if (!this.index) {
        if (!this.indexing) {
          this.indexing = buildIndex(this.opts.mounts);
        }
        this.index = await this.indexing;
        this.indexing = null;
      }
      return (_a = this.index.get(basename2.toLowerCase())) != null ? _a : null;
    }
    return null;
  }
  async read(absolutePath) {
    return fs.promises.readFile(absolutePath);
  }
};
function mountStatus(mount) {
  if (!mount) return { ok: false, detail: "empty path" };
  try {
    const stat = fs.statSync(mount);
    if (!stat.isDirectory()) return { ok: false, detail: "path exists but points to a file, not a folder" };
    const entries = fs.readdirSync(mount);
    return { ok: true, detail: `${entries.length} entries` };
  } catch (e) {
    const code = e.code;
    return { ok: false, detail: `cannot access (${code || String(e)})` };
  }
}

var ATTACHMENT_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|avif|mp4|webm|mov|m4v|mp3|wav|ogg|m4a|flac|pdf|md|txt|canvas|json)$/i;
async function scanVaultAttachments(vaultPath, attachmentFolderPath) {
  const results = [];
  const absDir = path.join(vaultPath, attachmentFolderPath);
  let entries;
  try {
    entries = await fs.promises.readdir(absDir, { withFileTypes: true });
  } catch (e) {
    return results;
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!ATTACHMENT_EXT.test(entry.name)) continue;
    const full = path.join(absDir, entry.name);
    let stat;
    try {
      stat = await fs.promises.stat(full);
    } catch (e) {
      continue;
    }
    results.push({ name: entry.name, path: full, size: stat.size });
  }
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

var FileSelectionModal = class extends import_obsidian2.Modal {
  constructor(app, files, onConfirm) {
    super(app);
    this.files = files;
    this.selected = new Set(files.map((f) => f.name));
    this.onConfirm = onConfirm;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Select attachments to move" });
    contentEl.createEl("p", {
      text: `${this.files.length} file(s) found in the vault's attachment folder. Select the ones you want to move externally.`,
      cls: "setting-item-description"
    });
    const selectAllRow = contentEl.createDiv({ cls: "setting-item" });
    selectAllRow.createDiv({ cls: "setting-item-info" }).createEl("label", { text: "Select all", cls: "setting-item-name" });
    const selectAllCb = selectAllRow.createEl("input", { attr: { type: "checkbox" } });
    selectAllCb.checked = true;
    selectAllCb.addEventListener("change", () => {
      if (selectAllCb.checked) {
        this.files.forEach((f) => this.selected.add(f.name));
      } else {
        this.selected.clear();
      }
      this.renderFileList(listEl);
    });
    const listEl = contentEl.createDiv({ cls: "external-attachment-file-list" });
    this.renderFileList(listEl);
    const btnRow = contentEl.createDiv({ cls: "modal-button-container" });
    new import_obsidian2.ButtonComponent(btnRow).setButtonText("Cancel").onClick(() => this.close());
    new import_obsidian2.ButtonComponent(btnRow).setButtonText("Move selected").setCta().onClick(() => {
      const chosen = this.files.filter((f) => this.selected.has(f.name));
      this.close();
      if (chosen.length > 0) this.onConfirm(chosen);
    });
  }
  renderFileList(container) {
    container.empty();
    for (const file of this.files) {
      const row = container.createDiv({ cls: "setting-item" });
      const info = row.createDiv({ cls: "setting-item-info" });
      info.createEl("label", { text: file.name, cls: "setting-item-name" });
      info.createEl("div", { text: formatBytes(file.size), cls: "setting-item-description" });
      const cb = row.createEl("input", { attr: { type: "checkbox" } });
      cb.checked = this.selected.has(file.name);
      cb.addEventListener("change", () => {
        if (cb.checked) this.selected.add(file.name);
        else this.selected.delete(file.name);
      });
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};

var MountSelectionModal = class extends import_obsidian2.Modal {
  constructor(app, mounts, onConfirm) {
    super(app);
    this.mounts = mounts;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Choose destination" });
    contentEl.createEl("p", {
      text: "Select which external folder to move the selected file(s) to.",
      cls: "setting-item-description"
    });
    const listEl = contentEl.createDiv();
    for (let i = 0; i < this.mounts.length; i++) {
      const mount = this.mounts[i];
      if (!mount) continue;
      const status = mountStatus(mount.path);
      const label = getMountLabel(mount);
      const row = listEl.createDiv({ cls: "setting-item" });
      const info = row.createDiv({ cls: "setting-item-info" });
      info.createEl("label", { text: label, cls: "setting-item-name" });
      info.createEl("div", {
        text: status.ok ? status.detail : "\u26A0 " + status.detail,
        cls: "setting-item-description"
      });
      new import_obsidian2.ButtonComponent(row).setButtonText("Move here").setCta().onClick(() => {
        this.close();
        this.onConfirm(mount.path);
      });
    }
    const btnRow = contentEl.createDiv({ cls: "modal-button-container" });
    new import_obsidian2.ButtonComponent(btnRow).setButtonText("Cancel").onClick(() => this.close());
  }
  onClose() {
    this.contentEl.empty();
  }
};

var LAYOUT_CONTAINERS = [
  "markdown-preview-view",
  "markdown-preview-sizer",
  "markdown-preview-section",
  "markdown-rendered",
  "markdown-source-view",
  "markdown-embed",
  "cm-content",
  "cm-sizer",
  "cm-contentContainer",
  "cm-scroller",
  "cm-editor"
];
function isScaffolding(el) {
  if (el.tagName === "BR") return true;
  if (el.classList.contains("cm-widgetBuffer")) return true;
  if ((el.textContent || "").trim()) return false;
  return el.querySelector("img, video, audio, iframe, canvas, svg, picture") === null;
}
function holdsEmbedsOnly(el) {
  for (const cls of LAYOUT_CONTAINERS) {
    if (el.classList.contains(cls)) return false;
  }
  let embeds = 0;
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node.nodeType === 3) {
      if (node.textContent && node.textContent.trim()) return false;
      continue;
    }
    if (node.nodeType !== 1) continue;
    const child = node;
    if (child.classList.contains("internal-embed")) {
      embeds++;
      continue;
    }
    if (!isScaffolding(child)) return false;
  }
  return embeds > 0;
}
function countEmbeds(el) {
  let n = 0;
  for (let i = 0; i < el.children.length; i++) {
    if (el.children[i].classList.contains("internal-embed")) n++;
  }
  return n;
}
function isEmbedRow(el) {
  return el !== null && holdsEmbedsOnly(el) && countEmbeds(el) > 1;
}

var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  mounts: [],
  recursive: false,
  showIndicator: true,
  enableSymlinks: false,
  symlinkFolder: "MILO_Symlinks",
  allowCrossLocationMoves: false,
  filetypeRules: [],
  interceptPaste: false
};
const LOCATION_COLOR_PALETTE = ["#5b8def", "#2aa198", "#d9822b", "#a66dd4", "#d95f8a", "#4aa3a2"];
function getDefaultLocationColor(index) {
  return LOCATION_COLOR_PALETTE[index % LOCATION_COLOR_PALETTE.length];
}
function normalizeLocationColor(value, index) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : getDefaultLocationColor(index);
}
function normalizeFiletypeExtension(value) {
  return String(value || "").trim().replace(/^\./, "").toLowerCase();
}
function normalizeFiletypeExtensions(values) {
  const source = Array.isArray(values) ? values : String(values || "").split(",");
  return [...new Set(source.map(normalizeFiletypeExtension).filter(Boolean))];
}
function normalizeFiletypeRules(values) {
  if (!Array.isArray(values)) return [];
  return values.map((rule, index) => ({
    id: rule && rule.id ? String(rule.id) : "rule-" + (index + 1),
    extensions: normalizeFiletypeExtensions(rule && rule.extensions),
    targetLocationId: rule && rule.targetLocationId ? String(rule.targetLocationId) : "",
    enabled: !rule || rule.enabled !== false
  })).filter((rule) => rule.extensions.length > 0 && rule.targetLocationId);
}
function migrateSettings(raw) {
  let migrated = false;
  const data = { ...raw };
  if (data.symlinkFolder === "_external_attachments") {
    data.symlinkFolder = "MILO_Symlinks";
    migrated = true;
  }
  if (typeof data.mountPath === "string" && !Array.isArray(data.mounts)) {
    data.mounts = data.mountPath ? [{ path: data.mountPath, label: "" }] : [];
    delete data.mountPath;
    migrated = true;
  }
  if (Array.isArray(data.mounts) && data.mounts.length > 0 && typeof data.mounts[0] === "string") {
    data.mounts = data.mounts.map((m) => typeof m === "string" ? { path: m, label: "" } : m);
    migrated = true;
  }
  const rawMounts = Array.isArray(data.mounts) ? data.mounts : [];
  const validMounts = rawMounts.filter((m) => m && typeof m === "object" && typeof m.path === "string" && m.path.trim());
  const removedEmptyMounts = validMounts.length !== rawMounts.length;
  const limitedToFreeEdition = validMounts.length > 1;
  if (Object.prototype.hasOwnProperty.call(data, "alignment")) {
    delete data.alignment;
    migrated = true;
  }
  const settings = {
    ...DEFAULT_SETTINGS,
    ...data,
    mounts: validMounts.slice(0, 1),
    filetypeRules: normalizeFiletypeRules(data.filetypeRules)
  };
  const locationIds = settings.mounts.map((mount, index) => ({
    ...mount,
    id: mount.id ? String(mount.id) : "location-" + (index + 1),
    color: normalizeLocationColor(mount.color, index)
  }));
  const locationIdsAdded = locationIds.some((mount, index) => !settings.mounts[index].id);
  const locationColorsAdded = locationIds.some((mount, index) => locationIds[index].color !== settings.mounts[index].color);
  settings.mounts = locationIds;
  return { settings, migrated: migrated || removedEmptyMounts || limitedToFreeEdition || locationIdsAdded || locationColorsAdded };
}
function getMountLabel(mount) {
  if (!mount) return "";
  if (mount.label && mount.label.trim()) return mount.label.trim();
  if (mount.path) {
    const base = path.basename(mount.path);
    if (base) return base;
  }
  return mount.path || "Unknown";
}
var MOUNT_KEY = /^mounts\.(\d+)$/;
var MOUNT_LABEL_KEY = /^mounts\.(\d+)\.label$/;
var MOUNT_PATH_KEY = /^mounts\.(\d+)$/;
var MOUNT_PLACEHOLDER = "D:\\ObsidianAttachments  or  ~/CloudDrive/attachments";
var LABEL_PLACEHOLDER = "Optional label (e.g. GDrive_Obsidian_attachments)";
var RECURSIVE_DESC = "Search nested folders inside each external location. MILO builds a filename index to make lookups fast; run \u201CRebuild Index\u201D from the command palette after adding or moving files.";
var INDICATOR_DESC = "Draw a thin dashed outline around embeds that resolved from an external folder, so they stand apart from in-vault attachments.";
var SYMLINK_DESC = "Create symlinks to your external folders.";
var SYMLINK_FOLDER_DESC = "Folder inside the vault where symlinks are created.";
var INTERCEPT_PASTE_DESC = "Upgrade to MILO Pro to ask where pasted or dropped attachments should be saved.";
var ExternalAttachmentsSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getSettingDefinitions() {
    return [];
  }

  getControlValue(key) {
    var _a;
    const labelMatch = MOUNT_LABEL_KEY.exec(key);
    if (labelMatch) {
      const mount = this.plugin.settings.mounts[Number(labelMatch[1])];
      return mount ? mount.label || "" : "";
    }
    const pathMatch = /^mounts\.(\d+)$/.exec(key);
    if (pathMatch) {
      const mount = this.plugin.settings.mounts[Number(pathMatch[1])];
      return mount ? mount.path || "" : "";
    }
    return this.plugin.settings[key];
  }
  async setControlValue(key, value) {
    const settings = this.plugin.settings;
    const labelMatch = MOUNT_LABEL_KEY.exec(key);
    if (labelMatch) {
      const idx = Number(labelMatch[1]);
      if (!settings.mounts[idx]) settings.mounts[idx] = { path: "", label: "" };
      settings.mounts[idx].label = String(value != null ? value : "").trim();
    } else {
      const pathMatch = /^mounts\.(\d+)$/.exec(key);
      if (pathMatch) {
        const idx = Number(pathMatch[1]);
        if (!settings.mounts[idx]) settings.mounts[idx] = { path: "", label: "" };
        settings.mounts[idx].path = String(value != null ? value : "").trim();
      } else if (key === "recursive") {
        settings.recursive = Boolean(value);
      } else if (key === "showIndicator") {
        settings.showIndicator = Boolean(value);
      } else if (key === "enableSymlinks") {
        settings.enableSymlinks = Boolean(value);
      } else if (key === "symlinkFolder") {
        settings.symlinkFolder = String(value != null ? value : DEFAULT_SETTINGS.symlinkFolder).trim() || DEFAULT_SETTINGS.symlinkFolder;
      } else if (key === "allowCrossLocationMoves") {
        settings.allowCrossLocationMoves = Boolean(value);
      } else if (key === "interceptPaste") {
        settings.interceptPaste = Boolean(value);
      } else {
        return;
      }
    }
    await this.plugin.saveSettings();
  }
  async addMount() {
    if (this.plugin.settings.mounts.length >= 1) {
      window.open(MILO_PRO_UPGRADE_URL, "_blank", "noopener,noreferrer");
      return;
    }
    this.plugin.settings.mounts.push({ id: "location-" + Date.now(), path: "", label: "", color: getDefaultLocationColor(this.plugin.settings.mounts.length) });
    await this.plugin.saveSettings();
    this.display();
  }
  async chooseMountFolder(index) {
    try {
      const electron = typeof window !== "undefined" && typeof window.require === "function" ? window.require("electron") : require("electron");
      const dialog = electron.remote?.dialog || electron.dialog;
      if (!dialog?.showOpenDialog) {
        new import_obsidian.Notice("Folder selection is unavailable in this Obsidian environment.");
        return;
      }
      const result = await dialog.showOpenDialog({
        title: "Choose external attachment folder",
        properties: ["openDirectory", "createDirectory"]
      });
      if (result.canceled || !result.filePaths?.[0]) return;
      await this.setControlValue("mounts." + index, result.filePaths[0]);
      this.display();
    } catch (error) {
      console.error("MILO: failed to choose external folder", error);
      new import_obsidian.Notice("MILO could not open the folder picker.");
    }
  }
  async removeMount(index) {
    this.plugin.settings.mounts.splice(index, 1);
    await this.plugin.saveSettings();
    this.display();
  }
  async removeEmptyMounts() {
    const validMounts = this.plugin.settings.mounts.filter((mount) => {
      return mount && String(mount.path || "").trim();
    });
    if (validMounts.length === this.plugin.settings.mounts.length) return;
    this.plugin.settings.mounts = validMounts;
    await this.plugin.saveSettings();
  }
  hide() {
    void this.removeEmptyMounts();
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h1", { text: "MILO", cls: "milo-settings-branding" });
    const mountList = containerEl.createDiv({ cls: "milo-mount-list milo-location-list" });
    const locationsHeader = mountList.createDiv({ cls: "milo-locations-header" });
    locationsHeader.createEl("h2", { text: "External locations", cls: "milo-section-title" });
    locationsHeader.createEl("p", {
      text: "Add folders outside your vault to resolve attachments from external drives or cloud storage.",
      cls: "milo-section-description"
    });
    if (this.plugin.settings.mounts.length > 0) {
      locationsHeader.createEl("p", {
        text: "The free edition includes one storage location. Upgrade to MILO Pro to add more.",
        cls: "milo-pro-upgrade-note"
      });
    }
    const tableHeader = mountList.createDiv({ cls: "milo-location-table-header" });
    tableHeader.createDiv();
    tableHeader.createDiv({ text: "Label" });
    tableHeader.createDiv({ text: "Location" });
    this.plugin.settings.mounts.forEach((mount, i) => {
      const status = mount.path ? mountStatus(mount.path) : null;
      const itemEl = mountList.createDiv({ cls: "milo-mount-item milo-location-card" });
      const row = new import_obsidian.Setting(itemEl).setName("");
      row.settingEl.addClass("milo-location-setting");
      const infoEl = row.settingEl.querySelector(".setting-item-info");
      const colorPicker = infoEl.createEl("input", {
        type: "color",
        cls: "milo-location-color-picker",
        attr: {
          title: "Indicator color",
          "aria-label": "Indicator color for " + getMountLabel(mount)
        }
      });
      colorPicker.value = normalizeLocationColor(mount.color, i);
      colorPicker.addEventListener("change", async () => {
        await this.setControlValue("mounts." + i + ".color", colorPicker.value);
      });
      row.addText(
        (text) => text.setPlaceholder(LABEL_PLACEHOLDER).setValue(mount.label || "").onChange(async (value) => {
          await this.setControlValue(`mounts.${i}.label`, value);
        })
      );
      row.addText(
        (text) => text.setPlaceholder("Choose a folder").setValue(mount.path || "").setDisabled(true)
      );
      row.addButton(
        (btn) => btn.setButtonText("Choose folder").onClick(() => {
          void this.chooseMountFolder(i);
        })
      );
      row.addExtraButton(
        (btn) => btn.setIcon("trash").setTooltip("Remove this folder").onClick(() => {
          void this.removeMount(i);
        })
      );
      row.setDesc(
        status ? status.ok ? status.detail : `\u26A0 ${status.detail}` : "Absolute path to a folder outside the vault."
      );
    });
    const addLocationSetting = new import_obsidian.Setting(mountList).addButton(
      (btn) => btn.setButtonText(this.plugin.settings.mounts.length > 0 ? "Unlock PRO to Add more Location" : "Add more Location").setCta().onClick(() => {
        void this.addMount();
      })
    );
    addLocationSetting.settingEl.addClass("milo-add-location-setting");
    const recursiveSection = containerEl.createDiv({ cls: "milo-feature-section milo-standalone-feature" });
    recursiveSection.createEl("h2", { text: "Search subfolders", cls: "milo-feature-section-title" });
    recursiveSection.createEl("p", { text: RECURSIVE_DESC, cls: "milo-feature-section-description" });
    const recursiveSetting = new import_obsidian.Setting(recursiveSection).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.recursive).onChange(async (value) => {
        await this.setControlValue("recursive", value);
      })
    );
    recursiveSetting.settingEl.addClass("milo-feature-setting");
    const indicatorSection = containerEl.createDiv({ cls: "milo-feature-section milo-standalone-feature" });
    indicatorSection.createEl("h2", { text: "Show visual indicator", cls: "milo-feature-section-title" });
    indicatorSection.createEl("p", { text: INDICATOR_DESC, cls: "milo-feature-section-description" });
    const indicatorSetting = new import_obsidian.Setting(indicatorSection).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.showIndicator).onChange(async (value) => {
        await this.setControlValue("showIndicator", value);
      })
    );
    indicatorSetting.settingEl.addClass("milo-feature-setting");
    const symlinkSection = containerEl.createDiv({ cls: "milo-feature-section milo-symlink-section" });
    symlinkSection.createEl("h2", { text: "Symlinks", cls: "milo-feature-section-title" });
    symlinkSection.createEl("p", {
      text: "Expose external folders inside the vault so Obsidian can index them.",
      cls: "milo-feature-section-description"
    });
    const symlinkToggle = new import_obsidian.Setting(symlinkSection).setName("Create symlinks in vault").setDesc(SYMLINK_DESC).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableSymlinks).onChange(async (value) => {
        await this.setControlValue("enableSymlinks", value);
      })
    );
    symlinkToggle.settingEl.addClass("milo-feature-setting");
    const symlinkFolder = new import_obsidian.Setting(symlinkSection).setName("Symlink folder name").setDesc(SYMLINK_FOLDER_DESC).addText(
      (text) => text.setPlaceholder("MILO_Symlinks").setValue(this.plugin.settings.symlinkFolder).onChange(async (value) => {
        await this.setControlValue("symlinkFolder", value);
      })
    );
    symlinkFolder.settingEl.addClass("milo-feature-setting");
    symlinkSection.createEl("p", {
      text: "After changing the folder or adding locations, run \"Refresh Symlinks\" from the command palette.",
      cls: "milo-feature-section-note"
    });
    const moveAcrossLocationsSetting = new import_obsidian.Setting(containerEl).setName("Allow moving files and attachments across locations").setDesc("Upgrade to MILO Pro to move files and attachments between configured locations.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.allowCrossLocationMoves).setDisabled(true).onChange(async (value) => {
        await this.setControlValue("allowCrossLocationMoves", value);
      })
    );
    moveAcrossLocationsSetting.settingEl.addClass("milo-pro-feature");
    const filetypeRulesSetting = new import_obsidian.Setting(containerEl).setName("Filetype Autorouting Rules").setDesc("Upgrade to MILO Pro to route new attachments by file extension.");
    filetypeRulesSetting.settingEl.addClass("milo-pro-feature");
    const proPasteSetting = new import_obsidian.Setting(containerEl).setName("Ask attachment location on paste/drop").setDesc(INTERCEPT_PASTE_DESC).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.interceptPaste).setDisabled(true).onChange(async (value) => {
        await this.setControlValue("interceptPaste", value);
      })
    );
    proPasteSetting.settingEl.addClass("milo-pro-feature");
    new import_obsidian.Setting(containerEl).setName("MILO Pro").setDesc("Unlock all MILO features with a one-time payment and lifetime license.").addButton(
      (btn) => btn.setButtonText("Get MILO Pro").setCta().onClick(() => {
        window.open(MILO_PRO_UPGRADE_URL, "_blank", "noopener,noreferrer");
      })
    );
  }
};

var ExternalAttachmentsPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.blobUrls =  new Set();

    this.mediaObservers =  new Set();
  }
  async onload() {
    await this.loadSettings();
    this.resolver = new MountResolver({
      mounts: this.settings.mounts,
      recursive: this.settings.recursive
    });
    this.addSettingTab(new ExternalAttachmentsSettingTab(this.app, this));
    this.registerMarkdownPostProcessor((el, ctx) => {
      this.processEmbeds(el, ctx);
    });
    const liveObserver = new MutationObserver((mutations) => {
      if (!this.resolver.active) return;
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (!n.instanceOf(Element)) continue;
          if (n.matches(".internal-embed:not([data-external-attachment])")) {
            void this.tryResolveExternal(n, { sourcePath: "" });
          }
          n.querySelectorAll(".internal-embed:not([data-external-attachment])").forEach((em) => {
            void this.tryResolveExternal(em, { sourcePath: "" });
          });
        }
      }
    });
    liveObserver.observe(this.app.workspace.containerEl, { childList: true, subtree: true });
    this.register(() => liveObserver.disconnect());
    this.addCommand({
      id: "rescan-current-view",
      name: "Rescan current view",
      callback: () => {
        var _a;
        const view = this.app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
        (_a = view == null ? void 0 : view.previewMode) == null ? void 0 : _a.rerender(true);
      }
    });
    this.addCommand({
      id: "rebuild-index",
      name: "Rebuild Index",
      callback: () => {
        this.resolver.invalidate();
        new import_obsidian2.Notice("MILO: index cleared; it rebuilds on the next lookup.");
      }
    });
    this.addCommand({
      id: "move-to-external",
      name: "Move attachments to external folder",
      callback: () => {
        if (!this.settings.allowCrossLocationMoves) return;
      void this.moveAttachmentsToExternal();
      }
    });
    this.addCommand({
      id: "refresh-symlinks",
      name: "Refresh Symlinks",
      callback: () => {
        void this.refreshSymlinks();
      }
    });
    this.addCommand({
      id: "remove-symlinks",
      name: "Remove external folder symlinks",
      callback: () => {
        void this.removeSymlinks();
      }
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file, source) => {
        if (!this.settings.allowCrossLocationMoves) return;
        const validMounts = this.settings.mounts.filter((m) => m && m.path && m.path.length > 0);
        if (validMounts.length === 0) return;
        if (!this.app.vault.getConfig("attachmentFolderPath")) return;
        const files = this.getAttachmentFiles(file);
        if (files.length === 0) return;
        for (const mount of validMounts) {
          const label = getMountLabel(mount);
          menu.addItem((mi) => {
            mi.setTitle("Move to " + label).setIcon("folder-input").onClick(() => {
              void this.moveFilesToMount(files, mount.path);
            });
          });
        }
      })
    );
  }
  onunload() {
    for (const observer of this.mediaObservers) observer.disconnect();
    this.mediaObservers.clear();
    for (const url of this.blobUrls) URL.revokeObjectURL(url);
    this.blobUrls.clear();
    void this.removeSymlinks();
  }
  async loadSettings() {
    var _a;
    const raw = (_a = await this.loadData()) != null ? _a : {};
    const { settings, migrated } = migrateSettings(raw);
    this.settings = settings;
    const hadInterceptPasteEnabled = this.settings.interceptPaste;
    const hadCrossLocationMovesEnabled = this.settings.allowCrossLocationMoves;
    this.settings.filetypeRules = [];
    this.settings.interceptPaste = false;
    this.settings.allowCrossLocationMoves = false;
    if (migrated || hadInterceptPasteEnabled || hadCrossLocationMovesEnabled) await this.saveData(this.settings);
  }
  refreshVisualIndicators() {
    document.querySelectorAll(".external-attachment-indicator").forEach((target) => {
      target.removeClass("external-attachment-indicator");
    });
    document.querySelectorAll('[data-external-attachment="true"]').forEach((embed) => {
      const locationId = embed.getAttribute("data-external-location-id");
      const sourceMount = this.settings.mounts.find((mount) => mount.id === locationId);
      const locationLabel = sourceMount ? getMountLabel(sourceMount) : "External location";
      embed.style.setProperty("--milo-location-color", sourceMount ? normalizeLocationColor(sourceMount.color, 0) : "var(--text-accent)");
      embed.setAttribute("title", "Resolved from " + locationLabel);
      if (this.settings.showIndicator) embed.addClass("external-attachment-indicator");
    });
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.resolver.setOptions({
      mounts: this.settings.mounts,
      recursive: this.settings.recursive
    });
    this.refreshVisualIndicators();
  }
  processEmbeds(el, ctx) {
    if (!this.resolver.active) return;
    el.querySelectorAll("span.internal-embed, div.internal-embed").forEach((embed) => {
      void this.tryResolveExternal(embed, ctx);
    });
  }
  async tryResolveExternal(embed, ctx) {
    try {
      await this.resolveEmbed(embed, ctx);
    } catch (err) {
      console.warn("MILO: resolve failed for", embed.getAttribute("src"), err);
    }
  }
  async resolveEmbed(embed, ctx) {
    var _a;
    const src = embed.getAttribute("src");
    if (!src) return;
    if (embed.getAttribute("data-external-attachment")) return;
    const linkpath = linkpathOf(src);
    const sourcePath = (_a = ctx == null ? void 0 : ctx.sourcePath) != null ? _a : "";
    const size = this.readSize(embed, src);
    const vaultFile = this.app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
    if (vaultFile) return;
    const basename2 = path2.basename(linkpath);
    const found = await this.resolver.resolve(basename2);
    const sourceMount = found ? this.settings.mounts.find((mount) => {
      const mountPath = mount && mount.path ? path2.normalize(mount.path) : "";
      const foundPath = path2.normalize(found);
      return mountPath && (foundPath === mountPath || foundPath.startsWith(mountPath + path2.sep));
    }) : null;
    if (!found) {
      embed.setAttribute("data-external-attachment", "miss");
      return;
    }
    const buffer = await this.resolver.read(found);
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeFor(basename2) });
    const url = URL.createObjectURL(blob);
    this.blobUrls.add(url);
    const parent = embed.parentNode;
    if (parent) {
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const n of m.removedNodes) {
            if (n === embed || n.instanceOf(Element) && n.contains(embed)) {
              URL.revokeObjectURL(url);
              this.blobUrls.delete(url);
              observer.disconnect();
              this.mediaObservers.delete(observer);
              return;
            }
          }
        }
      });
      observer.observe(parent, { childList: true });
      this.mediaObservers.add(observer);
    }
    embed.empty();
    embed.removeClass("is-unresolved");
    embed.removeClass("mod-error");
    embed.removeClass("file-embed");
    embed.removeClass("mod-empty-attachment");
    let mediaEl = null;
    if (IMG_EXT.test(basename2)) {
      mediaEl = embed.createEl("img", { attr: { src: url, alt: basename2 } });
    } else if (VIDEO_EXT.test(basename2)) {
      mediaEl = embed.createEl("video", { attr: { src: url, controls: "controls" } });
    } else if (AUDIO_EXT.test(basename2)) {
      mediaEl = embed.createEl("audio", { attr: { src: url, controls: "controls" } });
    } else if (PDF_EXT.test(basename2)) {
      mediaEl = embed.createEl("iframe", { attr: { src: url, width: "100%", height: "600px" } });
    } else {
      embed.createEl("a", { text: "\u2197 " + basename2, attr: { href: url, download: basename2 } });
    }
    const line = embed.parentElement;
    const row = isEmbedRow(line);
    if (mediaEl) this.applySize(mediaEl, size, row ? embed : null);
    embed.setAttribute("data-external-attachment", "true");
    if (sourceMount) {
      embed.setAttribute("data-external-location-id", sourceMount.id || "");
    }
    const indicatorTarget = embed;
    const locationLabel = sourceMount ? getMountLabel(sourceMount) : "External location";
    indicatorTarget.style.setProperty("--milo-location-color", sourceMount ? normalizeLocationColor(sourceMount.color, 0) : "var(--text-accent)");
    indicatorTarget.setAttribute("title", "Resolved from " + locationLabel);
    if (this.settings.showIndicator) {
      indicatorTarget.addClass("external-attachment-indicator");
    } else {
      indicatorTarget.removeClass("external-attachment-indicator");
    }
  }

  readSize(embed, src) {
    const width = embed.getAttribute("width");
    const height = embed.getAttribute("height");
    const paired = width && height ? `${width}x${height}` : width;
    const size = parseEmbedSize(
      src,
      embed.getAttribute("alt"),
      paired,
      embed.textContent
    );
    if (size && !size.height && height && /^\d+$/.test(height.trim())) {
      size.height = height.trim();
    }
    return size;
  }

  applySize(mediaEl, size, shrink) {
    if (!size) return;
    mediaEl.setAttribute("width", size.width);
    if (size.height) {
      mediaEl.setAttribute("height", size.height);
      mediaEl.setCssStyles({ width: `${size.width}px`, height: `${size.height}px` });
    } else if (mediaEl.tagName === "IFRAME") {
      mediaEl.setCssStyles({ width: `${size.width}px` });
    } else {
      mediaEl.setCssStyles({ width: `${size.width}px`, height: "auto" });
    }
    if (!shrink) return;
    shrink.setAttribute("width", size.width);
    if (size.height) shrink.setAttribute("height", size.height);
    shrink.setCssStyles({ width: `${size.width}px` });
    shrink.addClass("external-attachment-sized");
  }

  getSymlinkDir() {
    return path.join(this.app.vault.adapter.basePath, this.settings.symlinkFolder);
  }
  async refreshSymlinks() {
    const vaultPath = this.app.vault.adapter.basePath;
    const symlinkDir = this.getSymlinkDir();
    const validMounts = this.settings.mounts.filter((m) => m && m.path && m.path.length > 0);
    if (validMounts.length === 0) {
      new import_obsidian2.Notice("MILO: no external folders configured.");
      return;
    }
    try {
      await fs.promises.mkdir(symlinkDir, { recursive: true });
    } catch (e) {
      new import_obsidian2.Notice("MILO: failed to create symlink folder — " + e.message);
      return;
    }
    let created = 0;
    let skipped = 0;
    let removed = 0;
    let errors = 0;
    const desiredNames = new Set();
    for (const mount of validMounts) {
      const mountPath = mount.path;
      const basename2 = path.basename(mountPath);
      const name = basename2 || "mount";
      desiredNames.add(name);
      const linkPath = path.join(symlinkDir, name);
      let existing = null;
      try {
        existing = await fs.promises.lstat(linkPath);
      } catch (e) {

      }
      if (existing) {
        if (existing.isSymbolicLink()) {
          try {
            const target = await fs.promises.readlink(linkPath);
            if (target === mountPath) {
              skipped++;
              continue;
            }
            await fs.promises.unlink(linkPath);
          } catch (e) {
            console.error("MILO: failed to remove old symlink", linkPath, e);
            errors++;
            continue;
          }
        } else {
          const suffix = "_symlink";
          const fallbackName = name.length > 100 ? name.slice(0, 100) + suffix : name + suffix;
          desiredNames.delete(name);
          desiredNames.add(fallbackName);
          const fallbackPath = path.join(symlinkDir, fallbackName);
          try {
            await fs.promises.lstat(fallbackPath);
            skipped++;
            continue;
          } catch (e) {

          }
          try {
            await fs.promises.symlink(mountPath, fallbackPath, LINK_TYPE);
            created++;
          } catch (e) {
            console.error("MILO: failed to create symlink", fallbackPath, e);
            errors++;
          }
          continue;
        }
      }
      try {
        await fs.promises.symlink(mountPath, linkPath, LINK_TYPE);
        created++;
      } catch (e) {
        console.error("MILO: failed to create symlink", linkPath, e);
        errors++;
      }
    }
    try {
      const entries = await fs.promises.readdir(symlinkDir);
      for (const entry of entries) {
        if (desiredNames.has(entry)) continue;
        const entryPath = path.join(symlinkDir, entry);
        try {
          const stat = await fs.promises.lstat(entryPath);
          if (stat.isSymbolicLink()) {
            await fs.promises.unlink(entryPath);
            removed++;
          }
        } catch (e) {

        }
      }
    } catch (e) {

    }
    let msg = `MILO: symlinks — ${created} created, ${skipped} unchanged, ${removed} removed`;
    if (errors > 0) msg += `, ${errors} failed`;
    new import_obsidian2.Notice(msg);
  }
  async removeSymlinks() {
    const symlinkDir = this.getSymlinkDir();
    try {
      const entries = await fs.promises.readdir(symlinkDir);
      for (const entry of entries) {
        const entryPath = path.join(symlinkDir, entry);
        try {
          const stat = await fs.promises.lstat(entryPath);
          if (stat.isSymbolicLink()) {
            await fs.promises.unlink(entryPath);
          }
        } catch (e) {

        }
      }
      await fs.promises.rmdir(symlinkDir);
      new import_obsidian2.Notice("MILO: symlinks removed.");
    } catch (e) {

    }
  }

  isInAttachmentFolder(filePath) {
    const attachmentFolderPath = this.app.vault.getConfig("attachmentFolderPath");
    if (!attachmentFolderPath || !filePath) return false;
    const folder = attachmentFolderPath.replace(/^\//, "").replace(/\/$/, "");
    const normalized = filePath.replace(/^\//, "");
    return normalized.startsWith(folder + "/") || normalized === folder;
  }
  getAttachmentFiles(clickedFile) {
    if (!clickedFile || !clickedFile.path || !clickedFile.name) return [];
    if (!clickedFile.path.includes(".")) return [];
    if (!this.isInAttachmentFolder(clickedFile.path)) return [];
    return [clickedFile];
  }
  async moveFilesToMount(files, destMount) {
    if (!this.settings.allowCrossLocationMoves) return;
    let moved = 0;
    let skipped = 0;
    let errors = 0;
    for (const file of files) {
      const destPath = path.join(destMount, file.name);
      try {
        let existing = false;
        try {
          await fs.promises.access(destPath);
          existing = true;
        } catch (e) {

        }
        if (existing) {
          skipped++;
          continue;
        }
        const absSrc = path.join(this.app.vault.adapter.basePath, file.path);
        await fs.promises.copyFile(absSrc, destPath);
        await this.app.vault.delete(file);
        moved++;
      } catch (e) {
        console.error("MILO: failed to move", file.name, e);
        errors++;
      }
    }
    this.resolver.invalidate();
    let msg = `MILO: moved ${moved} file(s) to ${destMount}`;
    if (skipped > 0) msg += `. ${skipped} skipped (already exist).`;
    if (errors > 0) msg += ` ${errors} failed.`;
    new import_obsidian2.Notice(msg);
  }

  async moveAttachmentsToExternal() {
    if (!this.settings.allowCrossLocationMoves) return;
    const vault = this.app.vault;
    const adapter = vault.adapter;
    const vaultPath = adapter.basePath;
    const attachmentFolderPath = this.app.vault.getConfig("attachmentFolderPath");
    if (!attachmentFolderPath) {
      new import_obsidian2.Notice("MILO: no attachment folder configured in Obsidian settings.");
      return;
    }
    const validMounts = this.settings.mounts.filter((m) => m && m.path && m.path.length > 0);
    if (validMounts.length === 0) {
      new import_obsidian2.Notice("MILO: no external folders configured. Add one in the plugin settings first.");
      return;
    }
    const files = await scanVaultAttachments(vaultPath, attachmentFolderPath);
    if (files.length === 0) {
      new import_obsidian2.Notice("MILO: no attachments found in the vault's attachment folder.");
      return;
    }
    new FileSelectionModal(this.app, files, async (selected) => {
      new MountSelectionModal(this.app, validMounts, async (destMount) => {
        let moved = 0;
        let skipped = 0;
        let errors = 0;
        for (const file of selected) {
          const destPath = path.join(destMount, file.name);
          try {
            let existing = false;
            try {
              await fs.promises.access(destPath);
              existing = true;
            } catch (e) {

            }
            if (existing) {
              skipped++;
              continue;
            }
            await fs.promises.copyFile(file.path, destPath);
            await fs.promises.unlink(file.path);
            moved++;
          } catch (e) {
            console.error("MILO: failed to move", file.name, e);
            errors++;
          }
        }
        this.resolver.invalidate();
        let msg = `MILO: moved ${moved} file(s) to ${destMount}`;
        if (skipped > 0) msg += `. ${skipped} skipped (already exist).`;
        if (errors > 0) msg += ` ${errors} failed.`;
        new import_obsidian2.Notice(msg);
      }).open();
    }).open();
  }
};
