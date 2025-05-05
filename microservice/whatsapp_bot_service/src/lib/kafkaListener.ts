// src/lib/kafkaListener.ts
import { Kafka, EachMessagePayload } from 'kafkajs';

const kafka = new Kafka({
   clientId: 'whatsapp-bot-service',
   brokers: [process.env.KAFKA_BROKER || 'kafka:9093'],
});

const consumer = kafka.consumer({ groupId: 'whatsapp-bot-group' });

export const initializeKafkaConsumer = async (): Promise<void> => {
   await consumer.connect();
   console.log('[+] [KAFKA] Consumer connected.');
};

export const listenToKafkaMessages = async <T>(
   topic: string,
   handleMessage: (message: T) => void,
): Promise<void> => {
   await consumer.subscribe({ topic, fromBeginning: false });

   await consumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
         try {
            const parsedMessage: T = JSON.parse(
               message.value?.toString() || '{}',
            );
            console.log(
               `[.] [KAFKA] Received message from topic "${topic}":`,
               parsedMessage,
            );
            handleMessage(parsedMessage);
         } catch (error) {
            console.error('[X] [KAFKA] Error processing Kafka message:', error);
         }
      },
   });
};
