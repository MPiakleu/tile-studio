"""Inspect the actual SPPKG container and its manifest-to-asset references."""

from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import json
import posixpath
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
package = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "sharepoint/solution/imberon-tile-studio.sppkg"
solution = json.loads((ROOT / "config/package-solution.json").read_text())["solution"]
source_manifest = json.loads((ROOT / "src/webparts/tileStudio/TileStudioWebPart.manifest.json").read_text())
source_package = json.loads((ROOT / "package.json").read_text())

assert not solution.get("webApiPermissionRequests"), "Unexpected tenant API permissions requested"
assert solution["includeClientSideAssets"] is True

with ZipFile(package) as archive:
    assert archive.testzip() is None, "ZIP CRC integrity check failed"
    names = set(archive.namelist())
    assert "AppManifest.xml" in names and "[Content_Types].xml" in names
    assert all(not name.startswith("/") and ".." not in name.split("/") for name in names)
    for name in names:
        if name.endswith((".xml", ".rels")):
            tree = ET.fromstring(archive.read(name))
            if name.endswith(".rels"):
                folder = posixpath.dirname(posixpath.dirname(name))
                for relation in tree:
                    if relation.attrib.get("TargetMode") == "External":
                        continue
                    target = posixpath.normpath(posixpath.join(folder, relation.attrib["Target"].lstrip("/")))
                    assert target in names, f"Relationship target missing: {name} -> {target}"

    app = ET.fromstring(archive.read("AppManifest.xml"))
    assert app.attrib["ProductID"] == solution["id"]
    assert app.attrib["Version"] == solution["version"]
    assert app.attrib["IsClientSideSolution"] == "true"
    assert not any("Permission" in node.tag for node in app.iter()), "Unexpected permission request in app manifest"

    components = [name for name in names if "/WebPart_" in name and name.endswith(".xml")]
    assert len(components) == 1, "Exactly one Tile Studio component is expected"
    component_xml = ET.fromstring(archive.read(components[0]))
    component = next(node for node in component_xml if node.tag.endswith("ClientSideComponent"))
    manifest = json.loads(component.attrib["ComponentManifest"])
    assert manifest["id"] == source_manifest["id"]
    assert manifest["version"] == source_package["version"]
    assert manifest["supportsThemeVariants"] and manifest["supportsFullBleed"]
    resources = manifest["loaderConfig"]["scriptResources"]
    for name, resource in resources.items():
        if resource["type"] == "path":
            assert "ClientSideAssets/" + resource["path"] in names, f"Missing compiled resource: {name}"
    assert resources["react"]["version"] == "17.0.1"
    assert resources["react-dom"]["version"] == "17.0.1"

    runtime_name = "ClientSideAssets/" + resources["tile-studio-web-part"]["path"]
    runtime = archive.read(runtime_name).decode("utf-8")
    chunks = re.findall(r"chunk\.tile-studio-editor_[0-9a-f]+\.js", runtime)
    assert chunks, "Runtime has no editor chunk reference"
    for chunk in chunks:
        assert "ClientSideAssets/" + chunk in names, f"Missing editor chunk: {chunk}"
    javascript = [name for name in names if name.startswith("ClientSideAssets/") and name.endswith(".js")]
    for name in javascript:
        contents = archive.read(name).decode("utf-8")
        for forbidden in ("__tileStudioPreview", "localhost", "127.0.0.1", "access_as_user"):
            assert forbidden not in contents, f"Unexpected development or API grant marker in {name}: {forbidden}"

    print(f"PASS package integrity, XML relationships, solution/component versions, compiled runtime and editor assets, React compatibility, and absence of custom API permission requests ({package.stat().st_size:,} bytes; {len(javascript)} JavaScript assets).")
