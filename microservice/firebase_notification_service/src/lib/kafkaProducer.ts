import { Kafka, Partitioners } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'firebase-notification-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9093'],
});

export const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

export const initializeKafkaProducer = async () => {
  await producer.connect();
  console.log('[+] Kafka Producer connected.');
};

export const produceMessage = async (
  topic: string,
  message: Record<string, unknown>,
) => {
  try {
    const value = JSON.stringify(message);
    await producer.send({
      topic,
      messages: [{ value }],
    });
    console.log(`[✓] KAFKA > Message sent to topic "${topic}":`, message);
  } catch (error) {
    console.error(
      `[X] KAFKA > Failed to send message to topic "${topic}":`,
      error,
    );
  }
};
