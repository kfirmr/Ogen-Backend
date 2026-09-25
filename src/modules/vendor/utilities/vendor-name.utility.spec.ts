import { mapToCanonicalNames } from './vendor-name.utility';

describe('mapToCanonicalNames', () => {
  it('maps each name to the first earlier name it resembles', () => {
    const result = mapToCanonicalNames(
      ['Gym City', 'Netflix', 'GymCity Ltd', 'Gym City Center'],
      [
        { firstName: 'Gym City', secondName: 'GymCity Ltd' },
        { firstName: 'GymCity Ltd', secondName: 'Gym City Center' },
      ],
    );

    expect(Object.fromEntries(result)).toEqual({
      Netflix: 'Netflix',
      'Gym City': 'Gym City',
      'GymCity Ltd': 'Gym City',
      'Gym City Center': 'Gym City',
    });
  });

  it('keeps every name as its own canonical when nothing is similar', () => {
    const result = mapToCanonicalNames(['Netflix', 'Spotify'], []);

    expect(Object.fromEntries(result)).toEqual({
      Netflix: 'Netflix',
      Spotify: 'Spotify',
    });
  });
});
