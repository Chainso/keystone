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
