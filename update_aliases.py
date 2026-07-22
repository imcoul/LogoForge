import re
import json

with open('tsconfig.json', 'r') as f:
    ts = json.load(f)

if "paths" in ts["compilerOptions"]:
    ts["compilerOptions"]["paths"]["@/*"] = ["./src/*"]
else:
    ts["compilerOptions"]["paths"] = {"@/*": ["./src/*"]}

with open('tsconfig.json', 'w') as f:
    json.dump(ts, f, indent=2)

with open('vite.config.ts', 'r') as f:
    v = f.read()

v = v.replace("path.resolve(__dirname, '.')", "path.resolve(__dirname, './src')")
with open('vite.config.ts', 'w') as f:
    f.write(v)
