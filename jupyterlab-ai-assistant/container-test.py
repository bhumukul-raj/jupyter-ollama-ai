#!/usr/bin/env python3
"""
Container-to-Host Connectivity Test Script for JupyterLab AI Assistant

This script helps troubleshoot connectivity issues when running JupyterLab
in a container while trying to connect to Ollama on the host machine.

Usage:
    python container-test.py [--port PORT]

Options:
    --port PORT  Specify the Ollama port (default: 11434)
"""

import argparse
import os
import socket
import subprocess
import sys
import requests
import time

def check_is_container():
    """Check if we're running in a container environment."""
    container_indicators = [
        "/.dockerenv",  # Docker
        "/proc/1/cgroup"  # Check for container cgroups
    ]
    
    for indicator in container_indicators:
        if os.path.exists(indicator):
            if indicator == "/proc/1/cgroup":
                try:
                    with open(indicator, 'r') as f:
                        content = f.read()
                        if any(x in content for x in ['docker', 'kubepods', 'containerd', 'lxc']):
                            return True
                except Exception:
                    pass
            else:
                return True
                
    # Check for container-specific environment variables
    if os.environ.get("KUBERNETES_SERVICE_HOST") or os.environ.get("KUBERNETES_PORT"):
        return True
        
    return False

def test_host(host, port):
    """Test a single host connectivity."""
    url = f"http://{host}:{port}/api/tags"
    try:
        print(f"Testing {host}:{port}... ", end="", flush=True)
        response = requests.head(url, timeout=2)
        if response.status_code < 400:
            print(f"SUCCESS! ✅ - Status code: {response.status_code}")
            try:
                # Try to get model info
                models_response = requests.get(url, timeout=3)
                models_data = models_response.json()
                if 'models' in models_data:
                    model_count = len(models_data['models'])
                    models = [m.get('name', 'unknown') for m in models_data['models'][:3]]
                    print(f"  Found {model_count} models, including: {', '.join(models)}")
                    return True, url
                return True, url
            except Exception as e:
                print(f"  Connected but couldn't get model info: {str(e)}")
                return True, url
        else:
            print(f"FAILED ❌ - Status code: {response.status_code}")
            return False, None
    except requests.RequestException as e:
        print(f"FAILED ❌ - {str(e)}")
        return False, None
    except Exception as e:
        print(f"ERROR ❌ - {str(e)}")
        return False, None

def main():
    parser = argparse.ArgumentParser(description="Test container-to-host connectivity for Ollama")
    parser.add_argument("--port", type=int, default=11434, help="Ollama port (default: 11434)")
    args = parser.parse_args()
    
    port = args.port
    
    print("\n🔍 CONTAINER-TO-HOST CONNECTIVITY TEST 🔍\n")
    
    # Check if we're in a container
    in_container = check_is_container()
    if in_container:
        print("✅ Running in a container environment\n")
    else:
        print("⚠️  Not running in a container. This script is meant for container environments.\n")
        if input("Continue anyway? (y/N): ").lower() != 'y':
            return
    
    # Get current OLLAMA_BASE_URL if set
    current_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    print(f"Current Ollama URL: {current_url}\n")
    
    # List of hosts to try
    hosts_to_try = [
        "localhost",          # Won't work in container, but try anyway
        "127.0.0.1",          # Won't work in container, but try anyway
        "host.docker.internal", # Docker for Mac/Windows
        "gateway.docker.internal", # Some Docker configurations
        "host.containers.internal", # Podman
        "172.17.0.1",         # Default Docker bridge on Linux
        "172.18.0.1",         # Alternative Docker bridge
        "192.168.65.2"        # Docker Desktop for Mac
    ]
    
    # Try to get the default gateway
    try:
        gateway = subprocess.check_output(
            "ip route | grep default | cut -d ' ' -f 3", 
            shell=True, 
            stderr=subprocess.DEVNULL
        ).decode().strip()
        if gateway and gateway not in hosts_to_try:
            hosts_to_try.append(gateway)
    except Exception:
        pass
        
    # Try to get any other local IP addresses
    try:
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        if ip not in hosts_to_try and ip != "127.0.0.1":
            hosts_to_try.append(ip)
    except Exception:
        pass
    
    # If host.docker.internal doesn't resolve, it might need a host entry
    try:
        socket.gethostbyname("host.docker.internal")
    except socket.gaierror:
        print("⚠️  host.docker.internal does not resolve. You might need to run Docker with:")
        print("   --add-host=host.docker.internal:host-gateway\n")
    
    print("Testing potential host addresses:")
    print("--------------------------------")
    
    working_urls = []
    
    for host in hosts_to_try:
        success, url = test_host(host, port)
        if success:
            working_urls.append(url)
    
    print("\nRESULTS:")
    print("--------")
    
    if working_urls:
        print("✅ Working URLs found!\n")
        for i, url in enumerate(working_urls):
            print(f"{i+1}. {url}")
        
        print("\nTo configure JupyterLab AI Assistant to use Ollama on the host, set:")
        print(f"OLLAMA_BASE_URL={working_urls[0]}")
        print("\nYou can do this by:")
        print("1. Adding it to your environment before starting JupyterLab")
        print("2. Adding it to your Docker run command with -e OLLAMA_BASE_URL=...")
        print("3. Adding it to your jupyter_server_config.py file:")
        print("   c.OllamaConfig.base_url = \"" + working_urls[0] + "\"")
    else:
        print("❌ No working connections found")
        print("\nPossible solutions:")
        print("1. Make sure Ollama is running on the host")
        print("2. Try running your container with --network=host")
        print("3. Check firewall settings and make sure port 11434 is open")
        print("4. Run Docker with --add-host=host.docker.internal:host-gateway")
        print("5. Find your host's IP address and manually set OLLAMA_BASE_URL=http://<host-ip>:11434")

if __name__ == "__main__":
    main() 