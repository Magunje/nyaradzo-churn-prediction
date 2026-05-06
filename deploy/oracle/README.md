# Oracle Cloud Deployment

Use this when deploying the full churn prediction system on an Oracle Cloud Always Free Ubuntu VM.

## Recommended VM

- Image: Ubuntu 22.04 or 24.04
- Shape: Ampere A1 Flex or AMD Micro Always Free
- Memory: 1 GB minimum, 2 GB preferred
- Public IP: assign one, preferably reserved

## Open Oracle Networking

In the VM's subnet security list or network security group, add an ingress rule:

- Source CIDR: `0.0.0.0/0`
- IP protocol: TCP
- Destination port: `80`

## Deploy

SSH into the VM and run:

```bash
curl -fsSL https://raw.githubusercontent.com/Magunje/nyaradzo-churn-prediction/main/deploy/oracle/setup-ubuntu.sh | bash
```

Then open:

```text
http://YOUR_ORACLE_PUBLIC_IP
```

Default login:

- Email: `admin@nyaradzo.co.zw`
- Password: `Nyaradzo@123`

## Update The App

```bash
cd /opt/nyaradzo-churn-prediction
git pull
sudo docker compose -f deploy/oracle/docker-compose.yml up -d --build
```

## Logs

```bash
cd /opt/nyaradzo-churn-prediction
sudo docker compose -f deploy/oracle/docker-compose.yml logs -f app
```
