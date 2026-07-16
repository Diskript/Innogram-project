export function getRabbitMqUrl(): string {
  return process.env.RABBITMQ_URL ?? "amqp://innogram:innogram_password@localhost:5672";
}
