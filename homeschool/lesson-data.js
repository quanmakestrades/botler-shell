// Stewart Homeschool Board data
window.HOMESCHOOL_BOARD_DATA = {
  family: {
    name: 'Stewart Family Homeschool',
    dateLabel: 'Tomorrow Morning',
    focus: 'Technology + Nature + Device Safety',
    note: 'Web-first learning for new tablets, with strong safety habits and simple documentation.'
  },
  students: [
    {
      id: 'kage',
      name: 'Kage',
      loginCode: 'KAGE',
      colorClass: 'kage',
      level: 'older learner',
      strengths: ['lead helper', 'device setup helper', 'early tech reasoning'],
      goals: [
        'Explain basic device safety in his own words',
        'Complete the tech and nature observation activity',
        'Log what he learned on his board'
      ]
    },
    {
      id: 'avonte',
      name: 'Avonté',
      loginCode: 'AVONTE',
      colorClass: 'avonte',
      level: 'mid learner',
      strengths: ['hands-on learning', 'repetition', 'guided tablet exploration'],
      goals: [
        'Practice safe tablet habits with prompts',
        'Take part in nature observation with help',
        'Mark activity completion on his board'
      ]
    },
    {
      id: 'ezlynn',
      name: 'Ezlynn',
      loginCode: 'EZLYNN',
      colorClass: 'ezlynn',
      level: 'early learner',
      strengths: ['pointing, matching, noticing, helping'],
      goals: [
        'Learn simple safe/not safe device rules',
        'Notice colors, shapes, and sounds in nature',
        'Celebrate small wins and complete a short board flow'
      ]
    }
  ],
  records: {
    columns: [
      'date',
      'studentId',
      'studentName',
      'lessonSlug',
      'attendance',
      'deviceSetupComplete',
      'safetyTalkComplete',
      'natureWalkComplete',
      'reflectionComplete',
      'notes'
    ],
    rows: [
      {
        date: '2026-04-21',
        studentId: 'kage',
        studentName: 'Kage',
        lessonSlug: 'tech-nature-tablet-day',
        attendance: 'planned',
        deviceSetupComplete: 'pending',
        safetyTalkComplete: 'pending',
        natureWalkComplete: 'pending',
        reflectionComplete: 'pending',
        notes: 'New tablet onboarding planned.'
      },
      {
        date: '2026-04-21',
        studentId: 'avonte',
        studentName: 'Avonté',
        lessonSlug: 'tech-nature-tablet-day',
        attendance: 'planned',
        deviceSetupComplete: 'pending',
        safetyTalkComplete: 'pending',
        natureWalkComplete: 'pending',
        reflectionComplete: 'pending',
        notes: 'New tablet onboarding planned.'
      },
      {
        date: '2026-04-21',
        studentId: 'ezlynn',
        studentName: 'Ezlynn',
        lessonSlug: 'tech-nature-tablet-day',
        attendance: 'planned',
        deviceSetupComplete: 'pending',
        safetyTalkComplete: 'pending',
        natureWalkComplete: 'pending',
        reflectionComplete: 'pending',
        notes: 'New tablet onboarding planned.'
      }
    ]
  },
  lesson: {
    slug: 'tech-nature-tablet-day',
    title: 'Tech + Nature Launch Day',
    theme: 'Use the new tablets as learning tools first, then connect technology to the real world outside.',
    timing: '60 to 90 minutes total, flexible',
    ageFit: 'Mixed ages, designed for one shared family flow with individual student boards',
    outcomes: [
      'Every child logs into their own homeschool board',
      'Each child learns core tablet safety rules',
      'The family completes one simple nature observation activity',
      'A basic school record exists for each child'
    ],
    supplies: [
      'ONN tablets charged',
      'Wi-Fi connected',
      'Botler Shell homeschool board bookmarked',
      'Pencil or crayons',
      'Paper or notebook',
      'A window view, yard, porch, or short walk outside',
      'Water and shoes if going outdoors'
    ],
    tonightSetup: [
      'Connect each tablet to Wi-Fi',
      'Update once, then stop adding nonessential apps',
      'Pin browser plus Botler Shell to the home screen',
      'Explain that the tablet is mainly for school, learning, and creation',
      'Set simple rules: ask before downloading, no random links, no chatting with strangers, tell a parent if something feels weird',
      'Let each child explore their own board for a few minutes before bed'
    ],
    lessonBlocks: [
      {
        title: '1. Good Morning Tech Launch',
        duration: '10 minutes',
        details: [
          'Welcome the kids to their learning devices.',
          'Tell them the tablets are tools, not toys first.',
          'Show them how to open Botler Shell and the school tab.'
        ]
      },
      {
        title: '2. Tablet Safety Mini Talk',
        duration: '10 to 15 minutes',
        details: [
          'Teach safe websites, asking before downloads, keeping real names/private info private, and coming to a parent when confused.',
          'Use very short examples: safe, not safe, ask first.'
        ]
      },
      {
        title: '3. Nature + Tech Observation',
        duration: '20 to 30 minutes',
        details: [
          'Go outside or to a window and notice sky, plants, sounds, bugs, wind, or temperature.',
          'Each child records one thing they saw or learned on the board.'
        ]
      },
      {
        title: '4. Reflection + Record Keeping',
        duration: '10 to 15 minutes',
        details: [
          'Each child checks off their work.',
          'A parent adds notes if needed.',
          'Celebrate completion and close the lesson cleanly.'
        ]
      }
    ],
    familySafetyRules: [
      'School first, fun second',
      'Ask before downloading anything',
      'Do not click strange ads or popups',
      'Do not share names, addresses, or passwords',
      'If the screen shows something confusing, stop and ask'
    ],
    parentGuide: [
      {
        title: 'Tonight: Keep setup simple',
        body: [
          'Do not overload the tablets. Browser, Botler Shell, and only a few essential learning tools are enough.',
          'Treat them like cloud-first school terminals.',
          'If the tablets feel slow, close tabs instead of adding more apps.'
        ]
      },
      {
        title: 'Tomorrow: Open with purpose',
        body: [
          'Frame the tablets as tools for learning, creating, and tracking progress.',
          'Use plain language and short directions.',
          'Do not try to teach everything about internet safety in one sitting.'
        ]
      },
      {
        title: 'Tracking recommendation',
        body: [
          'Short term: use the built-in homeschool board tracker plus exportable CSV.',
          'Best next step: move the same tracking schema into Google Sheets so it is easy to edit from phones and tablets while keeping CSV export as backup.',
          'Keep one row per child per lesson day.'
        ]
      }
    ],
    studentPlans: {
      kage: {
        mission: 'Tech Captain + Nature Recorder',
        checklist: [
          'Open your homeschool board',
          'Review the family safety rules',
          'Help identify one safe and one unsafe online action',
          'Observe and write or tell one thing you noticed in nature',
          'Mark your lesson complete'
        ],
        reflectionPrompt: 'What is one smart way to use your tablet for learning tomorrow?'
      },
      avonte: {
        mission: 'Explorer + Safety Helper',
        checklist: [
          'Open your homeschool board',
          'Practice ask first before clicking or downloading',
          'Find one thing outside to notice',
          'Share what you saw or heard',
          'Mark your lesson complete'
        ],
        reflectionPrompt: 'What should you do if something on the tablet looks weird or confusing?'
      },
      ezlynn: {
        mission: 'Tiny Observer',
        checklist: [
          'Open your homeschool board',
          'Practice safe and ask for help rules',
          'Point to something you see outside',
          'Name a color, sound, or shape',
          'Finish with help and celebrate'
        ],
        reflectionPrompt: 'What did you see outside today?'
      }
    }
  }
};
