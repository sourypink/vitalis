// Recommendations built from the survey answers and activity level. [n] = source in research/RESEARCH.md.
import { STEADI_MAX, STEADI_RISK_SCORE, said, steadiScore, type Answers, type Level } from './survey'

export type TipGroup = 'Move' | 'Home safety' | 'Talk to your doctor'
export type Tip = { id: string; group: TipGroup; title: string; why: string; source: string }

export const TIP_GROUPS: { id: TipGroup; intro: string }[] = [
  { id: 'Move', intro: 'Exercise with balance and strength work cuts falls by about a quarter.' },
  { id: 'Home safety', intro: 'Small changes at home make trips less likely.' },
  { id: 'Talk to your doctor', intro: 'Bring these up at your next visit, or call if something is new.' },
]

export function buildTips(answers: Answers, level: Level): Tip[] {
  const tips: Tip[] = []
  const add = (tip: Tip) => tips.push(tip)
  const score = steadiScore(answers)
  const weakLegs = said(answers, 'pushUp') || said(answers, 'curb')
  const unsteady = said(answers, 'unsteady') || said(answers, 'furniture') || said(answers, 'worried')

  add({
    id: 'balance',
    group: 'Move',
    title: unsteady ? 'Balance practice, 3 days a week (start today)' : 'Balance practice, 3 days a week',
    why: 'Stand at the kitchen counter and lift one foot for 10 seconds, then the other. Tai chi classes count too. Balance and functional exercise cut falls by 24%.',
    source: '[21][27]',
  })
  add({
    id: 'sit-to-stand',
    group: 'Move',
    title: weakLegs ? 'Sit-to-stand: 10 times, twice a day' : 'Strength: 2 days a week',
    why: weakLegs
      ? 'You said standing up or curbs take effort, which points to weaker legs. Stand up from a sturdy chair without using your hands, if you can.'
      : 'Older adults should do muscle-strengthening activity at least 2 days a week: chair stands, light weights or bands.',
    source: weakLegs ? '[26]' : '[27]',
  })
  add(
    level.id < 2
      ? {
          id: 'walk-more',
          group: 'Move',
          title: 'Add one 10-minute walk after lunch',
          why: `You’re “${level.name}”. Building toward 150 active minutes a week lowers fall and health risk. A short daily walk is the easiest start.`,
          source: '[27]',
        }
      : {
          id: 'walk-keep',
          group: 'Move',
          title: 'Keep up your daily walks',
          why: `You’re “${level.name}”, at or above the 150-minute weekly goal. Vitalis will tell you if your walking starts to slow.`,
          source: '[27]',
        },
  )
  if (said(answers, 'cane')) {
    add({
      id: 'cane',
      group: 'Move',
      title: 'Use your cane or walker every time, even indoors',
      why: 'You said one was advised. People advised to use one may already be more likely to fall.',
      source: '[26]',
    })
  }

  add({ id: 'clutter', group: 'Home safety', title: 'Clear clutter and loose rugs from walkways', why: 'The CDC’s first home-safety step: remove clutter and tripping hazards.', source: '[26]' })
  add({
    id: 'night-light',
    group: 'Home safety',
    title: 'Night lights from bed to bathroom',
    why: said(answers, 'toilet')
      ? 'You said you often rush to the toilet. Rushing, especially at night, raises the chance of a fall.'
      : 'Light the path you walk at night, so you can see where you step.',
    source: '[26]',
  })

  if (score >= STEADI_RISK_SCORE) {
    add({
      id: 'steadi',
      group: 'Talk to your doctor',
      title: `Share your balance checklist (${score} of ${STEADI_MAX} points)`,
      why: `A score of ${STEADI_RISK_SCORE} or more means you may be at risk of falling. The CDC suggests discussing it with your doctor.`,
      source: '[26]',
    })
  }
  if (said(answers, 'fell')) {
    add({ id: 'fell', group: 'Talk to your doctor', title: 'Tell your doctor about your fall', why: 'People who have fallen once are likely to fall again, and the cause is often treatable.', source: '[26]' })
  }
  if (said(answers, 'medsDizzy') || said(answers, 'medsSleep')) {
    add({
      id: 'meds',
      group: 'Talk to your doctor',
      title: 'Ask for a medicine review',
      why: 'Medicines that make you light-headed, sleepy or help your mood can raise fall risk. Your doctor or pharmacist can check the doses.',
      source: '[26]',
    })
  }
  if (said(answers, 'feet')) {
    add({ id: 'feet', group: 'Talk to your doctor', title: 'Mention the numbness in your feet', why: 'Numb feet can cause stumbles. It’s worth checking the cause.', source: '[26]' })
  }
  if (said(answers, 'sad')) {
    add({ id: 'mood', group: 'Talk to your doctor', title: 'Mention feeling low', why: 'Feeling sad or slowed down is linked to falls, and it can be helped.', source: '[26]' })
  }
  add({ id: 'eyes', group: 'Talk to your doctor', title: 'Have your eyes checked once a year', why: 'Update your glasses when needed. Poor vision makes trips more likely.', source: '[26]' })

  return tips
}
