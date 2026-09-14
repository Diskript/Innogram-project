export function getRabbitMqUrl(): string {
  return (
    process.env.RABBITMQ_URL ??
    "amqp://innogram:innogram_password@localhost:5672"
  );
}

export function getRabbitMqConnectTimeoutMs(): number {
  const raw = process.env.AMQP_CONNECT_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
}
