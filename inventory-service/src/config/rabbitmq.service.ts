import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private isReady = false;
  
  private readonly rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  private readonly exchange = process.env.RABBITMQ_EXCHANGE || 'orders.exchange';
  private readonly queueOrdersCreated = process.env.RABBITMQ_QUEUE_ORDERS_CREATED || 'orders.created.queue';
  
  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    try {
      this.connection = amqp.connect([this.rabbitmqUrl], {
        heartbeatIntervalInSeconds: 30,
        reconnectTimeInSeconds: 5,
      });

      this.connection.on('connect', () => {
        this.logger.log('Connected to RabbitMQ');
      });

      this.connection.on('disconnect', (err) => {
        this.logger.error('Disconnected from RabbitMQ', err);
      });

      this.channelWrapper = this.connection.createChannel({
        json: false,
        setup: async (channel: Channel) => {
          await channel.assertExchange(this.exchange, 'topic', { durable: true });
          
          await channel.assertQueue(this.queueOrdersCreated, { durable: true });
          
          await channel.bindQueue(
            this.queueOrdersCreated,
            this.exchange,
            process.env.RABBITMQ_ROUTING_KEY_ORDER_CREATED || 'order.created',
          );

          this.isReady = true;
          this.logger.log('RabbitMQ channel setup completed');
        },
      });
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
      throw error;
    }
  }

  async publish(routingKey: string, message: any): Promise<void> {
    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      
      await this.channelWrapper.publish(
        this.exchange,
        routingKey,
        messageBuffer,
      );
      
      this.logger.log(`Message published to ${routingKey}: ${JSON.stringify(message)}`);
    } catch (error) {
      this.logger.error(`Failed to publish message to ${routingKey}`, error);
      throw error;
    }
  }

  async consume(
    queue: string,
    onMessage: (message: any) => Promise<void>,
  ): Promise<void> {
    // Wait for channel to be ready
    while (!this.isReady) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await this.channelWrapper.addSetup((channel: Channel) => {
      return channel.consume(
        queue,
        async (msg: ConsumeMessage | null) => {
          if (msg) {
            try {
              const content = JSON.parse(msg.content.toString());
              this.logger.log(`Message received from ${queue}: ${JSON.stringify(content)}`);
              
              await onMessage(content);
              
              channel.ack(msg);
              this.logger.log(`Message acknowledged from ${queue}`);
            } catch (error) {
              this.logger.error(`Error processing message from ${queue}`, error);
              channel.nack(msg, false, true);
            }
          }
        },
        { noAck: false },
      );
    });
  }

  getOrdersCreatedQueue(): string {
    return this.queueOrdersCreated;
  }
}
