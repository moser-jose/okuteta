# Okuteta 💈

**🇬🇧 [English](README.en.md) · 🇦🇴 [Português](README.pt.md)**

Barbershop booking API for Angola. Customers find barbershops nearby, pick services and a barber (or "anyone"), and
book a time.

API de marcações em barbearias de Angola. O cliente encontra barbearias perto de si, escolhe os serviços e o barbeiro
(ou "qualquer um") e marca a hora.

> **Status / Estado:** design approved, no code yet · design aprovado, ainda sem código.
> Next / Próximo: step 0, the project skeleton · passo 0, o esqueleto do projeto.

## At a glance / Em resumo

| | |
|---|---|
| **Market / Mercado** | Angola · kwanza (AOA) · `+244` · `Africa/Luanda` |
| **Model / Modelo** | Marketplace; free in the MVP, no commission · grátis no MVP, sem comissão |
| **Stack** | Java 25 · Spring Boot 4 · PostgreSQL 18 + PostGIS · Flyway · Maven |
| **Architecture / Arquitetura** | Modular monolith, Clean Architecture · monólito modular |
| **Modules / Módulos** | `user` · `shop` · `schedule` · `booking` · `review` · `notification` · `payment` · `messaging` |
| **Size / Tamanho** | 31 tables / tabelas · 141 use cases / casos de uso |
| **Sign-in / Entrada** | Email or phone + password · SMS or WhatsApp code · email link · Google · Facebook · Apple · passkeys · optional 2FA / 2FA opcional |
| **Bookings / Marcações** | Slot-based schedule, no overlaps, instant or approved, per-barbershop rules · agenda por slots, sem sobreposição |
| **Payments / Pagamentos** | Paid directly to the barbershop (cash, Multicaixa Express, Unitel Money, Afrimoney, transfer); the platform records payments and refunds · pago direto à barbearia |
| **Providers / Fornecedores** | Twilio (SMS, WhatsApp) · Brevo (email) · Firebase (push) · AWS S3 |
| **Infrastructure / Infraestrutura** | AWS `af-south-1`: ECS Fargate, RDS Multi-AZ, ALB + WAF, Terraform · ≈ US$290/month production, ≈ US$85 test |

## Documentation / Documentação

| | |
|---|---|
| [README.en.md](README.en.md) | Full documentation in English: features, setup, configuration, API, data model, architecture |
| [README.pt.md](README.pt.md) | Documentação completa em português |
| [docs/design.html](docs/design.html) | System design (in Portuguese): decisions, tables, use cases, state diagrams, AWS, risks. Open it in a browser · abrir no browser |
| [docs/arquitetura](docs/arquitetura) | Architecture drawings / desenhos da arquitetura |

## Quick start / Arranque rápido

Available after step 0 · disponível depois do passo 0. Requires JDK 25 and Docker · precisa do JDK 25 e do Docker.

```bash
docker compose up -d        # PostgreSQL + PostGIS and MinIO
./mvnw spring-boot:run      # http://localhost:8080 (dev profile)
./mvnw test                 # tests on H2
```
