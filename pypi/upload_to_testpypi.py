#!/usr/bin/env python3
"""
upload_to_testpypi.py - TestPyPI Upload Tool
===============================================

A secure utility for uploading Python distribution packages to TestPyPI.

This script provides a secure method for uploading Python distribution packages
(.whl and .tar.gz files) to TestPyPI. It uses environment variables for 
authentication credentials to avoid hardcoding sensitive information, making it 
safe to include in version control systems.

Features:
---------
- Secure credential handling through environment variables
- Automatic installation of dependencies (twine)
- Comprehensive error checking and logging
- Support for both wheel and source distributions

Requirements:
------------
- Python 3.6+
- Environment variables for authentication:
  - TESTPYPI_USERNAME: Your TestPyPI username
  - TESTPYPI_PASSWORD: Your TestPyPI password or API token

Usage:
------
1. Set environment variables:
   ```
   export TESTPYPI_USERNAME="your-username"
   export TESTPYPI_PASSWORD="your-password-or-token"
   ```

2. Run the script:
   ```
   python upload_to_testpypi.py [path_to_dist_folder]
   ```

   If no path is provided, it defaults to "../jupyterlab-ai-assistant/dist/"

Exit Codes:
----------
- 0: Success
- 1: Error (credentials missing, files not found, upload failed, etc.)

Note:
-----
This script is designed to be called by upload_to_testpypi.sh, which provides
a convenient shell interface, but can also be used standalone.
"""

import os
import sys
import subprocess
import logging
from pathlib import Path
from typing import List, Optional, Union, Tuple

# Configure logging with timestamp, level, and message
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

def check_twine_installed() -> bool:
    """
    Check if twine package is installed and available.
    
    Twine is required for uploading packages to PyPI/TestPyPI.
    
    Returns:
        bool: True if twine is installed, False otherwise
    """
    try:
        subprocess.run(
            ["twine", "--version"], 
            check=True, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE
        )
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        return False

def install_twine() -> bool:
    """
    Install twine package if not already installed.
    
    Uses pip to install the twine package which is required for
    uploading distribution packages to PyPI repositories.
    
    Returns:
        bool: True if installation was successful, False otherwise
    """
    try:
        logger.info("Installing twine...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "twine"],
            check=True,
            stdout=subprocess.PIPE
        )
        logger.info("Twine installed successfully.")
        return True
    except subprocess.SubprocessError as e:
        logger.error(f"Failed to install twine: {e}")
        return False

def get_distribution_files(dist_path: Path) -> List[Path]:
    """
    Find all distribution files in the specified directory.
    
    Searches for wheel (.whl) and source distribution (.tar.gz) files
    in the given directory path.
    
    Args:
        dist_path (Path): Path to directory containing distribution files
        
    Returns:
        List[Path]: List of paths to distribution files found
                   (empty list if none found or directory doesn't exist)
    """
    if not dist_path.exists():
        logger.error(f"Distribution directory not found: {dist_path}")
        return []
    
    # Get all wheel and source distribution files
    dist_files = list(dist_path.glob("*.whl")) + list(dist_path.glob("*.tar.gz"))
    
    if not dist_files:
        logger.error(f"No distribution files found in {dist_path}")
    else:
        logger.info(f"Found {len(dist_files)} distribution files")
    
    return dist_files

def check_credentials() -> bool:
    """
    Verify that TestPyPI credentials are available as environment variables.
    
    Checks for TESTPYPI_USERNAME and TESTPYPI_PASSWORD environment variables.
    
    Returns:
        bool: True if both credentials are set, False otherwise
    """
    username = os.environ.get("TESTPYPI_USERNAME")
    password = os.environ.get("TESTPYPI_PASSWORD")
    
    if not username:
        logger.error("TESTPYPI_USERNAME environment variable not set")
        return False
    
    if not password:
        logger.error("TESTPYPI_PASSWORD environment variable not set")
        return False
    
    return True

def upload_to_testpypi(dist_files: List[Path]) -> bool:
    """
    Upload distribution files to TestPyPI using twine.
    
    Uses the credentials from environment variables to authenticate with
    TestPyPI and uploads all specified distribution files.
    
    Args:
        dist_files (List[Path]): List of distribution file paths to upload
        
    Returns:
        bool: True if upload was successful, False otherwise
    """
    if not dist_files:
        logger.error("No distribution files to upload")
        return False
    
    try:
        # Prepare twine upload command with credentials from environment
        cmd = [
            "twine", "upload", 
            "--repository-url", "https://test.pypi.org/legacy/",
            "--username", os.environ.get("TESTPYPI_USERNAME", ""),
            "--password", os.environ.get("TESTPYPI_PASSWORD", ""),
            *[str(f) for f in dist_files]
        ]
        
        # Execute upload command
        logger.info(f"Uploading {len(dist_files)} files to TestPyPI...")
        for file in dist_files:
            logger.info(f"  - {file.name}")
            
        subprocess.run(cmd, check=True)
        logger.info("Upload successful!")
        return True
    except subprocess.SubprocessError as e:
        logger.error(f"Upload failed: {e}")
        return False

def main() -> int:
    """
    Main function to process command line arguments and upload files.
    
    Gets distribution directory from command-line arguments or uses default,
    checks for twine and credentials, then uploads files to TestPyPI.
    
    Returns:
        int: Exit code (0 for success, 1 for error)
    """
    # Get distribution directory from command line args or use default
    if len(sys.argv) > 1:
        dist_path = Path(sys.argv[1])
    else:
        dist_path = Path("../jupyterlab-ai-assistant/dist/")
    
    # Ensure dist_path is absolute
    dist_path = dist_path.absolute()
    
    logger.info(f"Using distribution directory: {dist_path}")
    
    # Check if twine is installed, install if missing
    if not check_twine_installed():
        logger.info("Twine not found. Attempting to install...")
        if not install_twine():
            return 1
    
    # Verify credentials are available
    if not check_credentials():
        logger.info("\nYou can set credentials using environment variables:")
        logger.info("export TESTPYPI_USERNAME='your-username'")
        logger.info("export TESTPYPI_PASSWORD='your-password-or-token'")
        logger.info("\nFor GitHub Actions, use secrets in your workflow file.")
        return 1
    
    # Get distribution files from specified directory
    dist_files = get_distribution_files(dist_path)
    if not dist_files:
        return 1
    
    # Upload files to TestPyPI
    if upload_to_testpypi(dist_files):
        logger.info(f"Successfully uploaded {len(dist_files)} files to TestPyPI")
        logger.info(f"Files: {', '.join(str(f.name) for f in dist_files)}")
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main()) 