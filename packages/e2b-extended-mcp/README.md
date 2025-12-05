# E2B Extended MCP Server

An extended E2B MCP server for Cherry Studio that adds file operations to the standard E2B code interpreter.

## Features

This server extends the standard E2B MCP server with the following tools:

| Tool | Description |
|------|-------------|
| `run_code` | Execute Python code in a secure E2B sandbox |
| `list_files` | List files and directories in the sandbox |
| `read_file` | Read file contents (text or base64 for binary) |
| `write_file` | Write content to a file in the sandbox |
| `download_url` | Get a public download URL for a file |
| `delete_file` | Delete a file from the sandbox |
| `make_directory` | Create a directory in the sandbox |
| `get_sandbox_info` | Get sandbox ID and host information |

## Installation

```bash
cd packages/e2b-extended-mcp
yarn install
yarn build
```

## Configuration for Cherry Studio

Add this MCP server to your Cherry Studio configuration:

```json
{
  "mcpServers": {
    "e2b-extended": {
      "command": "node",
      "args": ["/path/to/cherry-studio/packages/e2b-extended-mcp/dist/index.js"],
      "env": {
        "E2B_API_KEY": "your-e2b-api-key"
      }
    }
  }
}
```

Or using `tsx` for development:

```json
{
  "mcpServers": {
    "e2b-extended": {
      "command": "npx",
      "args": ["tsx", "/path/to/cherry-studio/packages/e2b-extended-mcp/src/index.ts"],
      "env": {
        "E2B_API_KEY": "your-e2b-api-key"
      }
    }
  }
}
```

## Usage Examples

### Running code and downloading results

1. Run code that creates a file:
   ```python
   # Tool: run_code
   import pandas as pd
   df = pd.DataFrame({'a': [1,2,3], 'b': [4,5,6]})
   df.to_csv('/tmp/output.csv', index=False)
   print("File created!")
   ```

2. Get the download URL:
   ```json
   // Tool: download_url
   { "path": "/tmp/output.csv" }
   ```

3. Or read the file directly:
   ```json
   // Tool: read_file
   { "path": "/tmp/output.csv" }
   ```

### Working with charts

1. Create a chart:
   ```python
   # Tool: run_code
   import matplotlib.pyplot as plt
   plt.figure()
   plt.plot([1, 2, 3], [1, 4, 9])
   plt.savefig('/tmp/chart.png')
   plt.show()
   ```

2. Get the download URL for the chart:
   ```json
   // Tool: download_url
   { "path": "/tmp/chart.png" }
   ```

## Environment Variables

- `E2B_API_KEY` (required): Your E2B API key from https://e2b.dev

## License

MIT
