import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'digitalArtHouseStorage',
  isDefault: true,
  access: (allow) => ({
    'profile-pictures/{entity_id}/*': [
      allow.guest.to(['read']),
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.authenticated.to(['read', 'write']), // Add this line to allow authenticated users to upload images
    ]
  })
});