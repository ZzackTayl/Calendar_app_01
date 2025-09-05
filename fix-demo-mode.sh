#!/bin/bash

echo "🔧 Starting demoMode cleanup script..."

# Find all files with demoMode references and process them
find app/ -name "*.tsx" -o -name "*.ts" | xargs grep -l "demoMode\|setDemoMode" | while read -r file; do
    echo "📄 Processing: $file"

    # Create backup
    cp "$file" "${file}.backup"

    # Remove demoMode from destructuring assignments
    sed -i '' -E 's/,?\s*demoMode\s*(=|(\,|\}))/}/g' "$file"
    sed -i '' -E 's/\{([^}]*),\s*demoMode\s*\}/{\1}/g' "$file"

    # Remove demoMode checks and related code blocks
    # This removes entire if (demoMode) blocks
    awk '
    BEGIN { in_demo_block = 0; brace_count = 0 }
    /^[^\/]*if \(demoMode\)/ {
        in_demo_block = 1
        brace_count = 0
        next
    }
    in_demo_block {
        for (i = 1; i <= length($0); i++) {
            char = substr($0, i, 1)
            if (char == "{") brace_count++
            if (char == "}") {
                brace_count--
                if (brace_count <= 0) {
                    in_demo_block = 0
                    next
                }
            }
        }
        if (brace_count > 0) next
    }
    { print }
    ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"

    # Remove demoMode variable declarations
    sed -i '' -E '/const demoMode = false;/d' "$file"
    sed -i '' -E '/const demoMode = true;/d' "$file"

    # Clean up empty lines and extra whitespace
    sed -i '' '/^[[:space:]]*$/d' "$file"

    echo "✅ Fixed: $file"
done

echo "🎉 demoMode cleanup complete!"
