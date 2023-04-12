import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand
} from '@aws-sdk/client-sqs';

import AbstractProvider from '../../providers';
import { calculateBackoffMultiplier } from '../../utils';
import { BaseSQS } from './base';
import { SQSClientOptions } from './types';

export class SQSProvider extends AbstractProvider {
  queueName: string;
  clientOptions: SQSClientOptions;
  client: BaseSQS;
  constructor(queueName: string, clientOptions: SQSClientOptions) {
    super();
    this.queueName = queueName;
    this.clientOptions = clientOptions;
    this.client = new BaseSQS(clientOptions);
  }

  async confirmMessage(message: object) {
    const receipt = message['ReceiptHandle'];
    const queueUrl = await this.client.queueUrl(this.queueName);
    try {
      return await this.client.client.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: receipt
        })
      );
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return Promise.resolve();
      }
      throw error;
    }
  }

  async messageNotProcessed(message: object) {
    if (!this.clientOptions.backoffFactor) return Promise.resolve();

    const backoffMultiplier = calculateBackoffMultiplier(
      parseInt(message['Attributes']['ApproximateReceiveCount'], 10),
      this.clientOptions.backoffFactor
    );

    const customVisibilityTimeout = Math.round(
      backoffMultiplier * this.clientOptions.visibilityTimeout
    );

    const queueUrl = await this.client.queueUrl(this.queueName);
    const receipt = message['ReceiptHandle'];
    try {
      return await this.client.client.send(
        new ChangeMessageVisibilityCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: receipt,
          VisibilityTimeout: customVisibilityTimeout
        })
      );
    } catch (error) {
      if (error.name !== 'InvalidParameterValue') {
        return Promise.resolve();
      }
      throw error;
    }
  }

  async fetchMessages(): Promise<object[]> {
    const queueUrl = await this.client.queueUrl(this.queueName);
    const messages = await this.client.client.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        VisibilityTimeout: this.clientOptions.visibilityTimeout,
        WaitTimeSeconds: 20
      })
    );
    return messages.Messages;
  }

  stop() {
    this.client.stop();
  }
}
