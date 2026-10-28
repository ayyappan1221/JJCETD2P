import re, json

path = "D2P_Lab_Expanded_Advanced_Master_List.md"
text = open(path, encoding="utf-8").read()

lines = text.splitlines()
categories = []
current = None

i = 0
while i < len(lines):
    line = lines[i].strip()
    # top-level category heading: "# N. Name"
    m = re.match(r"^#\s+\d+\.\s+(.+)$", line)
    if m:
        title = m.group(1).strip()
        current = {"category": title, "items": []}
        categories.append(current)
        i += 1
        continue
    # table row
    if line.startswith("|") and current is not None:
        if "Component" in line or set(line.replace("|","").strip()) <= set("-: "):
            i += 1
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) >= 2:
            name = cells[0]
            qty_str = cells[1]
            if name and name.lower() not in ("component", ""):
                try:
                    qty = int(qty_str)
                except ValueError:
                    qty = 0
                current["items"].append({"name": name, "quantity": qty})
        i += 1
        continue
    i += 1

categories = [c for c in categories if c["items"]]

# merge duplicate category names
merged = []
seen = {}
for c in categories:
    if c["category"] in seen:
        seen[c["category"]]["items"].extend(c["items"])
    else:
        seen[c["category"]] = {"category": c["category"], "items": list(c["items"])}
        merged.append(seen[c["category"]])

with open("components_data.json", "w", encoding="utf-8") as f:
    json.dump(merged, f, indent=2, ensure_ascii=False)

categories = merged

total = sum(len(c["items"]) for c in categories)
print(f"Categories: {len(categories)}")
print(f"Total items: {total}")
for c in categories:
    print(f"  {c['category']}: {len(c['items'])}")
