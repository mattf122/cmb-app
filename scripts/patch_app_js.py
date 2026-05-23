"""Splice VALID_CSI_CODES + normalizeCostCode into app.js immediately after CSI_DIV_MAP closing brace."""
import re
from pathlib import Path

APP_JS = Path(r"C:\Users\MattFarrier\OneDrive - Copper Mountain Builders\CMB Site Visits\App Code\app.js")
CODES_JS = Path(r"C:\Users\MattFarrier\OneDrive - Copper Mountain Builders\CMB Site Visits\App Code\scripts\valid_csi_codes_js.txt")

src = APP_JS.read_text(encoding="utf-8")
codes = CODES_JS.read_text(encoding="utf-8").rstrip()

# Marker to ensure idempotency
if "const VALID_CSI_CODES =" in src:
    print("ALREADY PATCHED - skipping VALID_CSI_CODES insert")
else:
    # Find CSI_DIV_MAP opening then its matching closing brace by brace-count
    start = src.find("const CSI_DIV_MAP = {")
    assert start != -1, "CSI_DIV_MAP not found"
    # Find closing }; after that — single-depth object
    depth = 0
    i = start
    while i < len(src):
        ch = src[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                # next char should be ; and newline
                end_brace = i
                break
        i += 1
    # Move past the '};' plus newline
    semi = src.find(";", end_brace)
    insert_at = src.find("\n", semi) + 1

    helper = '''
// Returns the canonical label for a cost code, fixing common AI errors:
// - Strips leading zero on single-digit divisions ("01.101" -> "1.101")
// - Validates against VALID_CSI_CODES master list
// - Fixes suffix to match cost type (01=Labor, 02=Material, 03=Subcontractor)
// - Falls back to a sane default within the same division if invalid
function normalizeCostCode(rawCode, costType, divNum){
  if(!rawCode) rawCode = "";
  rawCode = String(rawCode).trim();

  // Extract just the numeric prefix (e.g., "01.101" -> "1.101")
  let prefix = rawCode;
  const m = rawCode.match(/^(\\d+)\\.(\\d+)/);
  if(m){
    // Strip leading zero on division
    const div = String(parseInt(m[1], 10));
    let sub = m[2];
    // Truncate 4-digit hallucinations like "0103" to 3 digits "103"
    if(sub.length === 4) sub = sub.slice(-3);
    prefix = div + "." + sub;
  }

  // Force the suffix digit to match the cost type
  const suffixMap = { Labor: "1", Material: "2", Subcontractor: "3" };
  const wantSuffix = suffixMap[costType];
  if(wantSuffix && prefix.length >= 4){
    // Replace last digit with the correct suffix
    prefix = prefix.slice(0, -1) + wantSuffix;
  }

  // Look up canonical label
  if(VALID_CSI_CODES[prefix]) return VALID_CSI_CODES[prefix];

  // Fallback: try to find any valid code in the same division with matching suffix
  const targetDiv = divNum ? String(parseInt(divNum, 10)) : prefix.split(".")[0];
  const wantSfx = wantSuffix || "1";
  const fallbackKey = Object.keys(VALID_CSI_CODES).find(k => {
    const parts = k.split(".");
    return parts[0] === targetDiv && parts[1].endsWith(wantSfx);
  });
  if(fallbackKey) return VALID_CSI_CODES[fallbackKey];

  // Last resort: generic 1.101
  return "1.101 Project Administration and General Office Labor";
}

'''

    block = "\n" + codes + "\n" + helper
    new_src = src[:insert_at] + block + src[insert_at:]
    APP_JS.write_text(new_src, encoding="utf-8")
    print(f"Inserted {len(block)} chars after char {insert_at}")

# Verify key count
check = APP_JS.read_text(encoding="utf-8")
print("VALID_CSI_CODES key count:", check.count('\":\n') + check[check.find('const VALID_CSI_CODES'):check.find('const VALID_CSI_CODES')+50000].count('": "'))
# Simpler — count '": "' pairs in the VALID_CSI_CODES block
s = check.find("const VALID_CSI_CODES")
e = check.find("};", s)
snippet = check[s:e]
# Each key line looks like:   "X.YYY": "X.YYY ..."
import re as _re
keys = _re.findall(r'^\s*"(\d+\.\d+)":', snippet, flags=_re.MULTILINE)
print("Keys found in VALID_CSI_CODES:", len(keys))
