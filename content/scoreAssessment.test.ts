import { scorePoem, scoreRecap } from './scoreAssessment';

describe('scorePoem', () => {
  it('scores 17 as "Severe eczema"', () => {
    const result = scorePoem({
      poem_1: 4, poem_2: 4, poem_3: 3, poem_4: 3, poem_5: 3, poem_6: 0, poem_7: 0,
    });
    expect(result.scored).toBe(true);
    expect(result.score).toBe(17);
    expect(result.band).toBe('Severe eczema');
  });

  it('scores 2 (all answered) as "Clear or almost clear"', () => {
    const result = scorePoem({
      poem_1: 2, poem_2: 0, poem_3: 0, poem_4: 0, poem_5: 0, poem_6: 0, poem_7: 0,
    });
    expect(result.scored).toBe(true);
    expect(result.band).toBe('Clear or almost clear');
  });

  it('with 5 blanks is NOT scored', () => {
    const result = scorePoem({ poem_1: 1, poem_2: 1 });
    expect(result.scored).toBe(false);
  });

  it('with exactly one blank still scores, counting it as 0', () => {
    const result = scorePoem({
      poem_1: 4, poem_2: 4, poem_3: 4, poem_4: 4, poem_5: 4, poem_6: 4, // poem_7 blank
    });
    expect(result.scored).toBe(true);
    expect(result.score).toBe(24);
  });

  it('with two or more blanks is NOT scored', () => {
    const result = scorePoem({
      poem_1: 4, poem_2: 4, poem_3: 4, poem_4: 4, poem_5: 4, // 6 and 7 blank
    });
    expect(result.scored).toBe(false);
  });

  it('uses the highest score when multiple options were selected', () => {
    const result = scorePoem({
      poem_1: [1, 4], poem_2: 0, poem_3: 0, poem_4: 0, poem_5: 0, poem_6: 0, poem_7: 0,
    });
    expect(result.score).toBe(4);
  });
});

describe('scoreRecap', () => {
  it('sums to a raw score with no band', () => {
    const result = scoreRecap({
      recap_1: 2, recap_2: 1, recap_3: 1, recap_4: 0, recap_5: 0, recap_6: 1, recap_7: 2,
    });
    expect(result.scored).toBe(true);
    expect(result.score).toBe(7);
    expect(result.band).toBeNull();
  });
});
