import {
  BaseBulletedListPlugin,
  BaseListItemContentPlugin,
  BaseListItemPlugin,
  BaseListPlugin,
  BaseNumberedListPlugin,
  BaseTaskListPlugin,
} from '@platejs/list-classic';

import {
  BulletedListElementStatic,
  ListItemElementStatic,
  NumberedListElementStatic,
  TaskListElementStatic,
} from '@/components/ui/list-classic-node-static';

export const BaseListKit = [
  BaseListPlugin,
  BaseListItemPlugin,
  BaseListItemContentPlugin,
  BaseBulletedListPlugin.withComponent(BulletedListElementStatic),
  BaseNumberedListPlugin.withComponent(NumberedListElementStatic),
  BaseTaskListPlugin.withComponent(TaskListElementStatic),
  BaseListItemPlugin.withComponent(ListItemElementStatic),
];
