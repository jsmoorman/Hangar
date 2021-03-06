import { App, BlockAction } from '@slack/bolt';
import { subscribeActionId } from '../constants';
import { Subscriber } from '../../entities/subscriber';
import { getDashboardContext } from '../utilities/getDashboardContext';
import dashboardBlocks from '../blocks/dashboardBlocks';
import logger from '../../logger';
import { getWebClient } from '..';

// Ignore snake_case types from @slack/bolt
/* eslint-disable @typescript-eslint/camelcase */

function register(bolt: App): void {
  bolt.action<BlockAction>({ action_id: subscribeActionId }, async ({ ack, say, body }) => {
    ack();
    const slackId = body.user.id;
    const dashboardContext = await getDashboardContext(body.user.id);

    if (dashboardContext.isSubscribed) {
      // User is alredy subscribed
      // The original block will soon reflect the current state, so do nothing
    } else {
      // Create new subscribed user
      // TODO: Replace with Upsert
      const subscriber = (await Subscriber.findOne({ slackId })) || new Subscriber(body.user.id);
      subscriber.isActive = true;
      await subscriber.save();
      dashboardContext.isSubscribed = true;
    }

    try {
      await getWebClient().chat.update({
        ts: body.message.ts,
        channel: body.channel.id,
        text: '',
        blocks: dashboardBlocks(dashboardContext),
      });
    } catch (err) {
      logger.error('Unable to update original message in Slack', err);
    }

    say("You've subscribed! Keep an eye out from direct messages sent from this bot.");
  });
}

export default register;
