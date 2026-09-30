#!/usr/bin/env python3
"""
Figma Project & Design Reader
Reads Figma files, frames, components, and design context via Figma API.
"""

import os
import sys
import re
import json
import urllib.request
import urllib.error
import argparse

DEFAULT_TOKEN = os.getenv("FIGMA_TOKEN", "")

def extract_file_key(url_or_key: str) -> str:
    """Extract file key from Figma URL or return the key directly."""
    # Match patterns like:
    # https://www.figma.com/design/:file_key/...
    # https://www.figma.com/file/:file_key/...
    match = re.search(r'figma\.com/(?:design|file)/([0-9a-zA-Z]+)', url_or_key)
    if match:
        return match.group(1)
    return url_or_key.strip()

def figma_api_request(endpoint: str, token: str) -> dict:
    """Send authenticated request to Figma API."""
    url = f"https://api.figma.com/v1/{endpoint}"
    req = urllib.request.Request(
        url,
        headers={
            "X-Figma-Token": token,
            "User-Agent": "Antigravity-Figma-Reader/1.0"
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        raise RuntimeError(f"Figma API Error (HTTP {e.code}): {body}")
    except Exception as e:
        raise RuntimeError(f"Network error: {str(e)}")

def get_file_info(file_key: str, token: str) -> dict:
    """Fetch file metadata and structure."""
    return figma_api_request(f"files/{file_key}?depth=2", token)

def get_node_details(file_key: str, node_ids: list, token: str) -> dict:
    """Fetch specific node trees (e.g. specific frames or components)."""
    ids_str = ",".join(node_ids)
    return figma_api_request(f"files/{file_key}/nodes?ids={ids_str}", token)

def get_image_renders(file_key: str, node_ids: list, token: str, fmt: str = "png", scale: float = 2.0) -> dict:
    """Get image render URLs for frames/nodes."""
    ids_str = ",".join(node_ids)
    return figma_api_request(f"images/{file_key}?ids={ids_str}&format={fmt}&scale={scale}", token)

def summarize_file(data: dict) -> dict:
    """Generate a clean human-readable summary of file pages and top-level frames."""
    summary = {
        "name": data.get("name", "Untitled"),
        "lastModified": data.get("lastModified"),
        "version": data.get("version"),
        "pages": []
    }
    document = data.get("document", {})
    for page in document.get("children", []):
        page_summary = {
            "id": page.get("id"),
            "name": page.get("name"),
            "frames": []
        }
        for frame in page.get("children", []):
            page_summary["frames"].append({
                "id": frame.get("id"),
                "name": frame.get("name"),
                "type": frame.get("type"),
                "width": frame.get("absoluteBoundingBox", {}).get("width"),
                "height": frame.get("absoluteBoundingBox", {}).get("height")
            })
        summary["pages"].append(page_summary)
    return summary

def main():
    parser = argparse.ArgumentParser(description="Figma Project & Design Reader")
    parser.add_argument("target", help="Figma File URL or File Key")
    parser.add_argument("--token", default=os.getenv("FIGMA_TOKEN", DEFAULT_TOKEN), help="Figma Personal Access Token")
    parser.add_argument("--summary", action="store_true", help="Print summary of pages and top-level frames")
    parser.add_argument("--node", action="append", dest="nodes", help="Fetch specific node ID (can be repeated)")
    parser.add_argument("--export", help="Save full JSON output to specified file path")
    args = parser.parse_args()

    file_key = extract_file_key(args.target)
    print(f"[*] Accessing Figma File Key: {file_key}")

    try:
        if args.nodes:
            print(f"[*] Fetching nodes: {args.nodes}...")
            result = get_node_details(file_key, args.nodes, args.token)
        else:
            print("[*] Fetching file structure...")
            result = get_file_info(file_key, args.token)

        if args.summary:
            summary = summarize_file(result)
            print("\n=== Project Structure ===")
            print(f"File Name: {summary['name']}")
            print(f"Last Modified: {summary['lastModified']}")
            for p_idx, page in enumerate(summary["pages"], 1):
                print(f"\n[Page {p_idx}] {page['name']} (ID: {page['id']})")
                if not page["frames"]:
                    print("  (No frames)")
                for frame in page["frames"]:
                    dims = f"{frame['width']}x{frame['height']}" if frame['width'] else "N/A"
                    print(f"  - [{frame['type']}] {frame['name']} (ID: {frame['id']}, Size: {dims})")
        else:
            if not args.export:
                print(json.dumps(result, indent=2, ensure_ascii=False))

        if args.export:
            with open(args.export, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"[+] Output saved to {args.export}")

    except Exception as e:
        print(f"[!] Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
