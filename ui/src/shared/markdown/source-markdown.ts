export function normalizeMarkdownSourceBody(body: string) {
  return body.replace(/\r\n?/g, "\n");
}

export function normalizeMarkdownSourceTitle(title: string) {
  return title.trim();
}

export function buildMarkdownSourceSaveDraft(input: {
  body: string;
  title: string;
}) {
  return {
    body: normalizeMarkdownSourceBody(input.body),
    title: normalizeMarkdownSourceTitle(input.title)
  };
}

function isFenceMarker(line: string) {
  return /^\s*(```|~~~)/.test(line);
}

function isHeadingLine(line: string) {
  return /^\s{0,3}#{1,6}\s+/.test(line);
}

function isListItemLine(line: string) {
  return /^\s*(?:[-*+]|\d+[.)])\s+/.test(line);
}

function isBlockquoteLine(line: string) {
  return /^\s*>/.test(line);
}

function isTableLine(line: string) {
  return /^\s*\|/.test(line);
}

function isIndentedCodeLine(line: string) {
  return /^(?: {4}|\t)/.test(line);
}

function shouldUseSingleLineBreak(input: {
  currentLine: string;
  inFence: boolean;
  previousLine: string;
}) {
  const { currentLine, inFence, previousLine } = input;

  if (currentLine.trim().length === 0 || previousLine.trim().length === 0) {
    return true;
  }

  if (inFence || isFenceMarker(previousLine) || isFenceMarker(currentLine)) {
    return true;
  }

  const previousIsListItem = isListItemLine(previousLine);
  const currentIsListItem = isListItemLine(currentLine);

  if (previousIsListItem && currentIsListItem) {
    return true;
  }

  if (currentIsListItem) {
    return true;
  }

  const previousIsBlockquote = isBlockquoteLine(previousLine);
  const currentIsBlockquote = isBlockquoteLine(currentLine);

  if ((previousIsBlockquote && currentIsBlockquote) || currentIsBlockquote) {
    return true;
  }

  const previousIsTable = isTableLine(previousLine);
  const currentIsTable = isTableLine(currentLine);

  if ((previousIsTable && currentIsTable) || currentIsTable) {
    return true;
  }

  if (isHeadingLine(previousLine)) {
    return true;
  }

  if (isIndentedCodeLine(previousLine) && isIndentedCodeLine(currentLine)) {
    return true;
  }

  return false;
}

export function buildMarkdownSourceFromLines(contentLines: string[]) {
  const lines = contentLines.map((line) => line.replace(/\r/g, ""));

  if (lines.length === 0) {
    return "";
  }

  let markdown = "";
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = lines[index] ?? "";

    if (markdown.length === 0) {
      markdown = currentLine;

      if (isFenceMarker(currentLine)) {
        inFence = !inFence;
      }

      continue;
    }

    const previousLine = lines[index - 1] ?? "";

    markdown = `${markdown}${shouldUseSingleLineBreak({
      currentLine,
      inFence,
      previousLine
    })
      ? "\n"
      : "\n\n"}${currentLine}`;

    if (isFenceMarker(currentLine)) {
      inFence = !inFence;
    }
  }

  return markdown;
}
