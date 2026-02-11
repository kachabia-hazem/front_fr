import { Freelancer } from '../models';

export function getProfileCompletion(f: Freelancer): number {
  if (!f) return 0;

  const fields = [
    { value: f.firstName, weight: 10 },
    { value: f.lastName, weight: 10 },
    { value: f.gender, weight: 5 },
    { value: f.dateOfBirth, weight: 5 },
    { value: f.phoneNumber, weight: 10 },
    { value: f.profileTypes?.length, weight: 10 },
    { value: f.tjm, weight: 5 },
    { value: f.languages?.length, weight: 5 },
    { value: f.profilePicture, weight: 10 },
    { value: f.bio, weight: 10 },
    { value: f.skills?.length, weight: 10 },
    { value: f.currentPosition, weight: 5 },
    { value: f.location, weight: 5 },
  ];

  let completed = 0;
  let total = 0;

  for (const field of fields) {
    total += field.weight;
    if (field.value) {
      completed += field.weight;
    }
  }

  return Math.round((completed / total) * 100);
}
