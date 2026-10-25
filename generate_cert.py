import datetime
import socket
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import ipaddress

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

local_ip = get_local_ip()
print(f"Generating self-signed certificate for localhost and {local_ip}...")

# Generate private key
key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)

# Build certificate
subject = issuer = x509.Name([
    x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
    x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Global"),
    x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Lumina Vision"),
    x509.NameAttribute(NameOID.COMMON_NAME, "Lumina Smart Light"),
])

san_list = [
    x509.DNSName("localhost"),
    x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
]

try:
    san_list.append(x509.IPAddress(ipaddress.IPv4Address(local_ip)))
except Exception:
    pass

cert = (
    x509.CertificateBuilder()
    .subject_name(subject)
    .issuer_name(issuer)
    .public_key(key.public_key())
    .serial_number(x509.random_serial_number())
    .not_valid_before(datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1))
    .not_valid_after(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365))
    .add_extension(
        x509.SubjectAlternativeName(san_list),
        critical=False,
    )
    .sign(key, hashes.SHA256())
)

# Write private key
with open("key.pem", "wb") as f:
    f.write(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )

# Write cert
with open("cert.pem", "wb") as f:
    f.write(cert.public_bytes(serialization.Encoding.PEM))

print("Certificates created successfully: cert.pem and key.pem")
