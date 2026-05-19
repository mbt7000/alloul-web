"""Entry point — run with `python -m workspace_mcp` or `workspace-mcp`."""
from workspace_mcp.server import mcp


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
