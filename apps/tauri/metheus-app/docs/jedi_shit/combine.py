#!/usr/bin/env python3

import os
import re

def combine_markdown_files():
    """
    Combines README.md with all numbered markdown files into a single document.
    Files should be named like "01-system-architecture.md", "02-request-flow.md", etc.
    """
    print("Starting Mastra documentation combination process...")
    
    # Define the current directory and output file
    current_dir = os.getcwd()
    output_file = os.path.join(current_dir, "MastraCombined.md")
    
    # First read the README.md as the starting point
    readme_path = os.path.join(current_dir, "README.md")
    if not os.path.exists(readme_path):
        print(f"Error: README.md not found in {current_dir}")
        return False
    
    # Read README.md content
    try:
        with open(readme_path, 'r', encoding='utf-8') as f:
            combined_content = f.read() + "\n\n"
        print("Successfully read README.md")
    except Exception as e:
        print(f"Error reading README.md: {str(e)}")
        return False
    
    # Create a list to store files that were successfully read
    processed_files = ["README.md"]
    
    # Get all markdown files in the directory
    all_md_files = [f for f in os.listdir(current_dir) if f.endswith('.md') and f != "README.md" and f != "MastraCombined.md"]
    
    # Create a dictionary to map numbers to files
    numbered_files = {}
    
    # Process files by finding those that start with numbers
    for file_name in all_md_files:
        # Match files like "01-system-architecture.md" or "1-system-architecture.md"
        match = re.match(r'^(\d+)[-_].*\.md$', file_name)
        if match:
            file_number = int(match.group(1))
            numbered_files[file_number] = file_name
    
    # Process files in numerical order
    for number in sorted(numbered_files.keys()):
        file_name = numbered_files[number]
        file_path = os.path.join(current_dir, file_name)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                file_content = f.read()
                combined_content += f"\n\n# File: {file_name}\n\n{file_content}\n\n"
            processed_files.append(file_name)
            print(f"Added {file_name}")
        except Exception as e:
            print(f"Error reading {file_name}: {str(e)}")
    
    # Write the combined content to the output file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(combined_content)
        
        file_size_bytes = os.path.getsize(output_file)
        file_size_kb = file_size_bytes / 1024
        file_size_mb = file_size_kb / 1024
        
        print("\nCombination complete!")
        print(f"Combined document created at: {output_file}")
        print(f"Document size: {file_size_bytes} bytes ({file_size_kb:.2f} KB, {file_size_mb:.2f} MB)")
        print(f"Total files processed: {len(processed_files)}")
        print("Files included in order:")
        print(f"  - README.md")
        for num in sorted(numbered_files.keys()):
            print(f"  - {numbered_files[num]}")
        return True
    except Exception as e:
        print(f"Error writing combined file: {str(e)}")
        return False

if __name__ == "__main__":
    print("Mastra Documentation Combiner")
    print("----------------------------")
    combine_markdown_files()
