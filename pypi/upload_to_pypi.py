#!/usr/bin/env python3
"""
upload_to_pypi.py - PyPI Upload Tool
===============================================

A secure utility for uploading Python distribution packages to the main PyPI repository.

This script provides a secure method for uploading Python distribution packages
(.whl and .tar.gz files) to PyPI. It uses environment variables for 
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
  - PYPI_USERNAME: Your PyPI username
  - PYPI_PASSWORD: Your PyPI password or API token

Usage:
------
1. Set environment variables:
   ```
   export PYPI_USERNAME="your-username"
   export PYPI_PASSWORD="your-password-or-token"
   ```

2. Run the script:
   ```
   python upload_to_pypi.py [path_to_dist_folder]
   ```

   If no path is provided, it defaults to "../jupyterlab-ai-assistant/dist/"

Exit Codes:
----------
- 0: Success
- 1: Error (credentials missing, files not found, upload failed, etc.)

Note:
-----
This script is designed to be called by upload_to_pypi.sh, which provides
a convenient shell interface, but can also be used standalone.

WARNING:
-------
This script uploads to the MAIN PyPI repository, not TestPyPI.
Packages uploaded will be publicly available to all Python users.
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
    
    Twine is required for uploading packages to PyPI.
    
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
    Verify that PyPI credentials are available as environment variables.
    
    Checks for PYPI_USERNAME and PYPI_PASSWORD environment variables.
    
    Returns:
        bool: True if both credentials are set, False otherwise
    """
    username = os.environ.get("PYPI_USERNAME")
    password = os.environ.get("PYPI_PASSWORD")
    
    if not username:
        logger.error("PYPI_USERNAME environment variable not set")
        return False
    
    if not password:
        logger.error("PYPI_PASSWORD environment variable not set")
        return False
    
    return True

def confirm_production_upload() -> bool:
    """
    Confirm with the user that they want to upload to the main PyPI repository.
    
    This is an additional safety check to prevent accidental uploads.
    
    Returns:
        bool: True if user confirms, False otherwise
    """
    logger.warning("⚠️ WARNING: You are about to upload to the MAIN PyPI repository!")
    logger.warning("⚠️ This is NOT TestPyPI. Your package will be publicly available to all Python users.")
    
    try:
        response = input("Are you sure you want to continue? [y/N]: ").strip().lower()
        return response == 'y' or response == 'yes'
    except KeyboardInterrupt:
        logger.info("\nUpload cancelled.")
        return False

def upload_to_pypi(dist_files: List[Path]) -> bool:
    """
    Upload distribution files to PyPI using twine.
    
    Uses the credentials from environment variables to authenticate with
    PyPI and uploads all specified distribution files.
    
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
            "--username", os.environ.get("PYPI_USERNAME", ""),
            "--password", os.environ.get("PYPI_PASSWORD", ""),
            *[str(f) for f in dist_files]
        ]
        
        # Execute upload command
        logger.info(f"Uploading {len(dist_files)} files to PyPI...")
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
    checks for twine and credentials, then uploads files to PyPI.
    
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
        logger.info("export PYPI_USERNAME='your-username'")
        logger.info("export PYPI_PASSWORD='your-password-or-token'")
        logger.info("\nFor GitHub Actions, use secrets in your workflow file.")
        return 1
    
    # Get distribution files from specified directory
    dist_files = get_distribution_files(dist_path)
    if not dist_files:
        return 1
    
    # Confirm production upload
    if not confirm_production_upload():
        logger.info("Upload cancelled by user.")
        return 1
    
    # Upload files to PyPI
    if upload_to_pypi(dist_files):
        logger.info(f"Successfully uploaded {len(dist_files)} files to PyPI")
        logger.info(f"Files: {', '.join(str(f.name) for f in dist_files)}")
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main()) 