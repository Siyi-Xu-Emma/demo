import { faker } from '@faker-js/faker'
import { v4 as uuid } from 'uuid'
import { IocContract } from '@adonisjs/fold'
import { AppServices } from '../app'
import { WebhookEvent } from '../webhook/model'
import { sample } from 'lodash'  
import { EventPayload } from '../webhook/service'


const webhookEventTypes = ['event1', 'event2', 'event3']

export function randomWebhookEvent(): EventPayload {
  return {
    id: uuid(),
    type: sample(webhookEventTypes)!,
    data: { field1: faker.string.sample() }
  }
}

export async function createWebhookEvent(
  deps: IocContract<AppServices>,
  newEvent?: EventPayload
): Promise<WebhookEvent> {
  const knex = await deps.use('knex')
  return await WebhookEvent.query(knex).insert(newEvent || randomWebhookEvent())
}