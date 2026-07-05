const { Notice, Plugin, normalizePath } = require("obsidian");
const { spawn } = require("child_process");
const fs = require("fs");
const nodePath = require("path");

const VIDEO_EXTENSIONS = new Set(["mp4", "m4v", "webm", "ogv", "mov"]);
const MIME_EXTENSIONS = {
  "video/mp4": "mp4",
  "video/x-m4v": "m4v",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov"
};

function extensionOf(name) {
  const match = name.toLowerCase().match(/\.([^.]+)$/);
  return match ? match[1] : "";
}

function isVideo(file) {
  return file.type.startsWith("video/") || VIDEO_EXTENSIONS.has(extensionOf(file.name));
}

function safeFileName(file) {
  let name = file.name || `video-${Date.now()}`;
  let extension = extensionOf(name);

  if (!VIDEO_EXTENSIONS.has(extension) && MIME_EXTENSIONS[file.type]) {
    name = name.replace(/\.[^.]+$/, "");
    extension = MIME_EXTENSIONS[file.type];
    name = `${name}.${extension}`;
  }

  return name.replace(/[\\/:*?"<>|]/g, "-");
}

function positionAtDrop(event, editor, view) {
  const candidates = [
    editor.cm,
    editor.cm6,
    view?.editor?.cm,
    view?.currentMode?.editor?.cm
  ].filter(Boolean);

  for (const codeMirror of candidates) {
    try {
      if (typeof codeMirror.posAtCoords === "function") {
        const offset = codeMirror.posAtCoords(
          { x: event.clientX, y: event.clientY },
          false
        );
        if (Number.isInteger(offset)) return editor.offsetToPos(offset);
      }

      if (typeof codeMirror.coordsChar === "function") {
        const position = codeMirror.coordsChar(
          { left: event.clientX, top: event.clientY },
          "window"
        );
        if (position && Number.isInteger(position.line)) {
          return { line: position.line, ch: position.ch || 0 };
        }
      }
    } catch (error) {
      console.warn("Unable to resolve video drop position", error);
    }
  }

  return editor.getCursor();
}

function findFfmpeg() {
  const candidates = [
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg"
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function convertToMp4(ffmpeg, input, output) {
  return new Promise((resolve, reject) => {
    const process = spawn(ffmpeg, [
      "-y",
      "-i", input,
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "160k",
      "-movflags", "+faststart",
      output
    ]);
    let errorOutput = "";

    process.stderr.on("data", (data) => {
      errorOutput = `${errorOutput}${data}`.slice(-4000);
    });
    process.on("error", reject);
    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(errorOutput || `FFmpeg exited with code ${code}`));
      }
    });
  });
}

module.exports = class BlogVideoEmbedPlugin extends Plugin {
  async onload() {
    this.registerEvent(
      this.app.workspace.on("editor-drop", async (event, editor, view) => {
        const files = Array.from(event.dataTransfer?.files || []);
        const videos = files.filter(isVideo);
        if (!videos.length) return;

        event.preventDefault();
        event.stopPropagation();

        const article = view?.file || this.app.workspace.getActiveFile();
        if (!article) {
          new Notice("请先打开一篇文章，再拖入视频");
          return;
        }

        try {
          const dropPosition = positionAtDrop(event, editor, view);
          const jobs = videos.map((file, index) => ({
            file,
            marker: `<!-- blog-video-${Date.now()}-${index} -->`
          }));
          editor.replaceRange(
            `\n\n${jobs.map(({ marker }) => marker).join("\n\n")}\n\n`,
            dropPosition
          );

          for (const { file, marker } of jobs) {
            const saved = await this.saveBesideArticle(article, file);
            const webVideo = await this.prepareForWeb(saved);
            const shortcode = `{{< video src="${webVideo.name}" caption="" >}}`;
            await this.replaceMarker(article, editor, marker, shortcode);
          }

          new Notice(`已添加 ${videos.length} 个视频`);
        } catch (error) {
          console.error("Unable to add blog video", error);
          new Notice(`视频添加失败：${error.message || error}`);
        }
      })
    );
  }

  async saveBesideArticle(article, file) {
    const directory = article.parent?.path || "";
    const originalName = safeFileName(file);
    const dot = originalName.lastIndexOf(".");
    const stem = dot > 0 ? originalName.slice(0, dot) : originalName;
    const extension = dot > 0 ? originalName.slice(dot) : "";
    let name = originalName;
    let index = 2;

    while (this.app.vault.getAbstractFileByPath(normalizePath(`${directory}/${name}`))) {
      name = `${stem}-${index}${extension}`;
      index += 1;
    }

    const path = normalizePath(`${directory}/${name}`);
    return this.app.vault.createBinary(path, await file.arrayBuffer());
  }

  async replaceMarker(article, editor, marker, shortcode) {
    const editorContent = editor.getValue();
    const markerOffset = editorContent.indexOf(marker);

    if (markerOffset >= 0) {
      editor.replaceRange(
        shortcode,
        editor.offsetToPos(markerOffset),
        editor.offsetToPos(markerOffset + marker.length)
      );
      return;
    }

    let replaced = false;
    await this.app.vault.process(article, (content) => {
      if (!content.includes(marker)) return content;
      replaced = true;
      return content.replace(marker, shortcode);
    });

    if (!replaced) {
      throw new Error(`无法在文章中找到视频占位符：${marker}`);
    }
  }

  async prepareForWeb(file) {
    if (extensionOf(file.name) !== "mov") return file;

    const ffmpeg = findFfmpeg();
    const basePath = this.app.vault.adapter.getBasePath?.();
    if (!ffmpeg || !basePath) {
      new Notice("未找到 FFmpeg，MOV 已保留；建议转换为 H.264 MP4 后再发布");
      return file;
    }

    const directory = file.parent?.path || "";
    const stem = file.basename;
    let outputName = `${stem}.mp4`;
    let outputPath = normalizePath(`${directory}/${outputName}`);
    let index = 2;

    while (
      this.app.vault.getAbstractFileByPath(outputPath) ||
      fs.existsSync(nodePath.join(basePath, outputPath))
    ) {
      outputName = `${stem}-${index}.mp4`;
      outputPath = normalizePath(`${directory}/${outputName}`);
      index += 1;
    }

    new Notice(`正在将 ${file.name} 转换为网页兼容格式…`);
    await convertToMp4(
      ffmpeg,
      nodePath.join(basePath, file.path),
      nodePath.join(basePath, outputPath)
    );
    try {
      await this.app.vault.delete(file);
    } catch (error) {
      console.warn(`Unable to remove converted source video ${file.path}`, error);
    }

    return { name: outputName };
  }
};
