exports.handler = async function(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: {...headers, "Content-Type": "application/json"}, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: {...headers, "Content-Type": "application/json"}, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { apiKey, stream, ...body } = JSON.parse(event.body);

    if (!apiKey) {
      return { statusCode: 400, headers: {...headers, "Content-Type": "application/json"}, body: JSON.stringify({ error: { message: "No API key provided" } }) };
    }

    // Non-streaming path (concepts, photo analysis)
    if (!stream) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) {
        return { statusCode: response.status, headers: {...headers, "Content-Type": "application/json"}, body: JSON.stringify({ error: { message: data.error?.message || "API error" } }) };
      }
      return { statusCode: 200, headers: {...headers, "Content-Type": "application/json"}, body: JSON.stringify(data) };
    }

    // Streaming path — collect full response then return
    // Netlify doesn't support true HTTP streaming, so we use a longer timeout trick:
    // Request streaming from Anthropic but collect all chunks, then return complete
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({ ...body, stream: true })
    });

    if (!response.ok) {
      const errData = await response.json();
      return { statusCode: response.status, headers: {...headers, "Content-Type": "application/json"}, body: JSON.stringify({ error: { message: errData.error?.message || "API error" } }) };
    }

    // Read the stream and collect all text
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let inputTokens = 0;
    let outputTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              fullText += parsed.delta.text;
            }
            if (parsed.type === "message_start" && parsed.message?.usage) {
              inputTokens = parsed.message.usage.input_tokens;
            }
            if (parsed.type === "message_delta" && parsed.usage) {
              outputTokens = parsed.usage.output_tokens;
            }
          } catch(e) { /* skip malformed chunks */ }
        }
      }
    }

    return {
      statusCode: 200,
      headers: {...headers, "Content-Type": "application/json"},
      body: JSON.stringify({
        content: [{ type: "text", text: fullText }],
        usage: { input_tokens: inputTokens, output_tokens: outputTokens }
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: {...headers, "Content-Type": "application/json"},
      body: JSON.stringify({ error: { message: "Function error: " + err.message } })
    };
  }
};
