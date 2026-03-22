import os

def replace_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace all http://${window.location.hostname}:8001 with empty string for relative paths
    content = content.replace("`http://${window.location.hostname}:8001", "`")
    # Also replace potential string concatenations if present, though grep only showed template literals
    
    with open(filepath, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            replace_in_file(filepath)

print("Replacement complete.")
