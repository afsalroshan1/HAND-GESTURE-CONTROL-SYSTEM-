import http.server
import ssl
import socket
import threading
import sys

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow cross-origin and iframe embedding if needed
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

def run_http(port=8080):
    server = http.server.ThreadingHTTPServer(("0.0.0.0", port), CustomHandler)
    server.serve_forever()

def run_https(port=8443):
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile="cert.pem", keyfile="key.pem")
    server = http.server.ThreadingHTTPServer(("0.0.0.0", port), CustomHandler)
    server.socket = context.wrap_socket(server.socket, server_side=True)
    server.serve_forever()

if __name__ == "__main__":
    local_ip = get_local_ip()
    print("=" * 60)
    print("  LUMINA MULTI-DEVICE SMART LIGHT SERVER")
    print("=" * 60)
    print(f"  * Local PC (HTTP):    http://localhost:8080")
    print(f"  * Local PC (HTTPS):   https://localhost:8443")
    print(f"  * Other Devices (IP): https://{local_ip}:8443 (Recommended for Phone Camera)")
    print(f"  * Other Devices (IP): http://{local_ip}:8080")
    print("=" * 60)
    print("  Note: On mobile browsers using HTTPS, click 'Advanced -> Proceed'")
    print("  to accept the self-signed certificate and allow camera access.")
    print("=" * 60)

    # Start HTTPS in thread
    t = threading.Thread(target=run_https, args=(8443,), daemon=True)
    t.start()

    # Start HTTP on main thread
    run_http(8080)
