// Đề Writing của bộ Weekly Mock Test (UNICOACH Mock Test nn) — TÁCH RIÊNG khỏi kho luyện tập P01–P18
// và khỏi TASK1_BANK/TASK2_BANK, để đề thi tuần không lọt vào trang luyện tập của học viên.
// LMS gọi bằng mã đề "MTnn" (vd "MT01"); mỗi tuần thêm một mục vào WEEKLY_PAPERS.
import { TEST_PAPERS } from './writing-papers';
import { TASK1_BANK, TASK2_BANK, Task1Item, Task2Item } from './writing-tasks';

export interface ResolvedPaper {
  paper: { id: string; level: string; focus: string };
  t1: Task1Item;
  t2: Task2Item;
}

const WEEKLY_PAPERS: Record<string, { focus: string; t1: Task1Item; t2: Task2Item }> = {
  MT01: {
    focus: 'UNICOACH Mock Test 1 (18/10/2026): Task 1 bảng điện tái tạo; Task 2 AI thay giáo viên.',
    t1: {
      id: 'mt01-t1', category: 'environment', chartType: 'table',
      title: 'Tỷ trọng điện tái tạo ở bốn nước châu Âu (%)',
      instruction: 'The table below shows the share of electricity generated from renewable sources (wind, solar, hydroelectric and biomass) in four European countries between 2015 and 2025, with projections for 2030. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
      table: {
        headers: ['Country', '2015 (%)', '2020 (%)', '2025 (%)', '2030 (projected %)'],
        rows: [
          ['Denmark', 55.4, 65.2, 78.5, 88.0],
          ['Germany', 31.5, 45.3, 53.8, 65.0],
          ['Spain', 36.8, 44.0, 51.2, 60.0],
          ['United Kingdom', 24.6, 43.1, 48.7, 62.0],
        ],
      },
    },
    t2: {
      id: 'mt01-t2', category: 'education', type: 'discussion',
      prompt: 'Some people believe that artificial intelligence systems will soon replace human educators and university lecturers, providing a more personalised and cost-effective learning experience. Others argue that human interaction and mentorship remain irreplaceable. Discuss both these views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
    },
  },
  MT02: {
    focus: 'UNICOACH Weekly 2 (25/10/2026): Task 1 bảng phương tiện đi làm; Task 2 học hai ngoại ngữ ở trường.',
    t1: {
      id: 'mt02-t1', category: 'transport', chartType: 'table',
      title: 'Phương tiện đi làm của người trưởng thành (%), 1995–2025',
      instruction: 'The table below shows the percentage of adults who used five different ways of travelling to work in one city in 1995, 2005, 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
      table: {
        headers: ['Method of travel', '1995 (%)', '2005 (%)', '2015 (%)', '2025 (%)'],
        rows: [
          ['Car', 52, 47, 41, 36],
          ['Bus', 21, 24, 27, 25],
          ['Train / metro', 18, 20, 18, 19],
          ['Bicycle', 4, 6, 11, 17],
          ['Walking', 5, 3, 3, 3],
        ],
      },
    },
    t2: {
      id: 'mt02-t2', category: 'education', type: 'discussion',
      prompt: 'Some people think that all children should learn at least two foreign languages at school, starting from primary level. Others believe that this takes time away from other important subjects. Discuss both these views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
    },
  },
  MT03: {
    focus: "UNICOACH Weekly 3 (01/11/2026): Task 1 Percentage of hospitals using AI software to support imaging diagnosis; Task 2 opinion.",
    t1: {
      id: 'mt03-t1', category: 'weekly', chartType: 'table',
      title: "Percentage of hospitals using AI software to support imaging diagnosis",
      instruction: "The table below shows the percentage of hospitals in four countries that used AI software to support the diagnosis of medical images in 2015, 2020 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
      table: {
        headers: ["Country", "2015", "2020", "2025"],
        rows: [
          ["Canada", "4%", "18%", "46%"],
          ["Japan", "6%", "22%", "58%"],
          ["Brazil", "1%", "9%", "31%"],
          ["Norway", "3%", "21%", "52%"],
        ],
      },
    },
    t2: {
      id: 'mt03-t2', category: 'weekly', type: "opinion",
      prompt: "Some people believe that museums and libraries should put all their collections online, so that physical visits will no longer be necessary. To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
    },
  },
  MT04: {
    focus: "UNICOACH Weekly 4 (08/11/2026): Task 1 Average monthly temperature at four research stations (°C); Task 2 discussion.",
    t1: {
      id: 'mt04-t1', category: 'weekly', chartType: 'table',
      title: "Average monthly temperature at four research stations (°C)",
      instruction: "The table below shows the average temperature in January and July at four polar research stations. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
      table: {
        headers: ["Station", "January", "July"],
        rows: [
          ["Station Alpha (Antarctica, coast)", -2.0, -19.0],
          ["Station Beta (Antarctica, plateau)", -28.0, -60.0],
          ["Station Gamma (Greenland, summit)", -31.0, -12.0],
          ["Station Delta (Svalbard)", -14.0, 6.0],
        ],
      },
    },
    t2: {
      id: 'mt04-t2', category: 'weekly', type: "discussion",
      prompt: "Some people think that scientific expeditions to remote places such as the polar regions are too expensive and that governments should spend the money on problems at home. Others believe that this research is essential. Discuss both views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
    },
  },
  MT05: {
    focus: "UNICOACH Weekly 5 (15/11/2026): Task 1 Visitors to five heritage sites (thousands per year); Task 2 opinion.",
    t1: {
      id: 'mt05-t1', category: 'weekly', chartType: 'table',
      title: "Visitors to five heritage sites (thousands per year)",
      instruction: "The table below shows the number of visitors, in thousands, to five heritage sites in 2000, 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
      table: {
        headers: ["Site", "2000", "2010", "2020"],
        rows: [
          ["Harbour museum", 120.0, 260.0, 310.0],
          ["Roman fort", 85.0, 90.0, 70.0],
          ["Castle gardens", 210.0, 205.0, 240.0],
          ["Industrial railway", 40.0, 95.0, 180.0],
          ["Abbey ruins", 150.0, 130.0, 95.0],
        ],
      },
    },
    t2: {
      id: 'mt05-t2', category: 'weekly', type: "opinion",
      prompt: "Some people believe that governments should invest more in renewable energy sources, such as wave and tidal power, even if these are more expensive than fossil fuels. To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
    },
  },
  MT06: {
    focus: "UNICOACH Weekly 6 (22/11/2026): Task 1 Household waste recycled in five cities (% of total); Task 2 discussion.",
    t1: {
      id: 'mt06-t1', category: 'weekly', chartType: 'table',
      title: "Household waste recycled in five cities (% of total)",
      instruction: "The table below shows the percentage of household waste that was recycled in five cities in 2005, 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
      table: {
        headers: ["City", "2005", "2015", "2025"],
        rows: [
          ["Aldermoor", 18.0, 31.0, 52.0],
          ["Brightwell", 42.0, 47.0, 49.0],
          ["Carrick", 12.0, 29.0, 38.0],
          ["Dunmere", 35.0, 33.0, 27.0],
          ["Eastvale", 25.0, 44.0, 61.0],
        ],
      },
    },
    t2: {
      id: 'mt06-t2', category: 'weekly', type: "discussion",
      prompt: "Some people believe that scientists should be free to edit human genes to prevent inherited diseases. Others think that this research is dangerous and should be banned. Discuss both views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
    },
  },
  MT07: {
    // Phan chốt 23–24/11/2026: Weekly lấy đề từ bộ HIT (đề thi thật). Task 1 = HIT-W1-13 (BC Huỳnh Mẫn Đạt 8/8/2026), Task 2 = HIT-W-10 (BC 188 Cầu Giấy 17/8/2026).
    focus: "UNICOACH Weekly 7 (29/11/2026): Task 1 percentage of employers in four sectors having difficulty finding three types of staff, 2003 and 2004 (table); Task 2 discussion (young people choosing their future job).",
    t1: {
      id: 'mt07-t1', category: 'weekly', chartType: 'table',
      title: "Percentage of employers having difficulty in finding staff, by sector (2003 and 2004)",
      instruction: "The table below shows the percentage of employers in various sectors having difficulty in finding staff in 2003 and 2004. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
      unit: '%',
      table: {
        headers: ["Sector", "Skilled workers 2003", "Skilled workers 2004", "Unskilled workers 2003", "Unskilled workers 2004", "Technical and managerial staff 2003", "Technical and managerial staff 2004"],
        rows: [
          ["Manufacturing", 45, 51, 26, 28, 8, 6],
          ["Building", 42, 45, 21, 23, 14, 10],
          ["Commerce", 47, 41, 22, 19, 2, 0],
          ["Services", 41, 45, 20, 29, 5, 2],
        ],
      },
    },
    t2: {
      id: 'mt07-t2', category: 'weekly', type: "discussion",
      prompt: "Some people say young people should be completely free to choose their future job but others think young people must be more realistic in their choice. Discuss both views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
    },
  },
  MT08: {
    // Phan chốt 23–24/11/2026: Weekly lấy đề từ bộ HIT (đề thi thật). Task 1 = HIT-W1-12 (IDP Đà Nẵng 11/8/2026), Task 2 = HIT-W-09 (IDP Green Edu Tân Sơn Nhì 16/8/2026).
    focus: "UNICOACH Weekly 8 (06/12/2026): Task 1 students in six departments at an Australian university in 2009 — % female, % first language not English, % born outside Australia (table); Task 2 opinion (housing shortage in big cities, only government action can solve it).",
    t1: {
      id: 'mt08-t1', category: 'weekly', chartType: 'table',
      title: "Students studying in various departments at an Australian university in 2009",
      instruction: "The table shows information about students studying in six different departments at an Australian university in 2009. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
      unit: '%',
      table: {
        headers: ["Department", "% Female", "% first language not English", "% Born outside Australia"],
        rows: [
          ["English", 67, 16, 27],
          ["Physics", 37, 38, 44],
          ["Chemistry", 29, 32, 47],
          ["Modern languages", 63, 41, 54],
          ["History", 58, 10, 18],
          ["Maths", 42, 36, 43],
        ],
      },
    },
    t2: {
      id: 'mt08-t2', category: 'weekly', type: "opinion",
      prompt: "The shortage of housing in big cities can cause severe social consequences. Only government action can solve this problem. To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
    },
  },
  MT09: {
    focus: "UNICOACH Weekly 9 (13/12/2026): Task 1 How children travelled to school in one city (% of children); Task 2 adv-disadv.",
    t1: {
      id: 'mt09-t1', category: 'weekly', chartType: 'table',
      title: "How children travelled to school in one city (% of children)",
      instruction: "The table below shows the percentage of children who used four methods of travelling to school in one city in 2000, 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
      table: {
        headers: ["Method", "2000", "2010", "2020"],
        rows: [
          ["Car", 24.0, 35.0, 48.0],
          ["Bus", 30.0, 28.0, 25.0],
          ["Walking", 38.0, 28.0, 19.0],
          ["Cycling", 8.0, 9.0, 8.0],
        ],
      },
    },
    t2: {
      id: 'mt09-t2', category: 'weekly', type: "adv-disadv",
      prompt: "In many cities, the authorities are limiting the use of private cars in the city centre. Do the advantages of this development outweigh the disadvantages? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
    },
  },
  MT10: {
    focus: "UNICOACH Weekly 10 (20/12/2026): Task 1 Visitor numbers at four city attractions (thousands); Task 2 discussion.",
    t1: {
      id: 'mt10-t1', category: 'weekly', chartType: 'table',
      title: "Visitor numbers at four city attractions (thousands)",
      instruction: "The table below shows the number of visitors, in thousands, to four attractions in one city in 2006, 2016 and 2026. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
      table: {
        headers: ["Attraction", "2006", "2016", "2026"],
        rows: [
          ["National Museum", 520.0, 610.0, 700.0],
          ["Science Centre", 300.0, 450.0, 620.0],
          ["Art Gallery", 410.0, 390.0, 360.0],
          ["Maritime Museum", 150.0, 160.0, 155.0],
        ],
      },
    },
    t2: {
      id: 'mt10-t2', category: 'weekly', type: "discussion",
      prompt: "Some people believe that museums and galleries should be free for everyone to enter. Others think that visitors should pay an entrance fee. Discuss both views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
    },
  },
  MT11: {
    focus: "UNICOACH Weekly 11 (27/12/2026): Task 1 Average time spent on three media each day by age group (minutes); Task 2 problem-solution.",
    t1: {
      id: 'mt11-t1', category: 'weekly', chartType: 'table',
      title: "Average time spent on three media each day by age group (minutes)",
      instruction: "The table below shows the average number of minutes per day that people in three age groups spent on watching television, using social media and listening to the radio in one country in 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
      table: {
        headers: ["Age group", "Television", "Social media", "Radio"],
        rows: [
          ["16–24", 45.0, 165.0, 20.0],
          ["25–54", 120.0, 95.0, 55.0],
          ["55 and over", 215.0, 35.0, 85.0],
        ],
      },
    },
    t2: {
      id: 'mt11-t2', category: 'weekly', type: "problem-solution",
      prompt: "In many countries, people are working longer hours than they did in the past, and they have less time for family and friends. What problems does this cause? What can be done to solve these problems? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
    },
  },
  MT12: {
    focus: "UNICOACH Weekly 12 (03/01/2027): Task 1 Household energy use by source in one country (% of total); Task 2 opinion.",
    t1: {
      id: 'mt12-t1', category: 'weekly', chartType: 'table',
      title: "Household energy use by source in one country (% of total)",
      instruction: "The table below shows the percentage of household energy that came from four sources in one country in 1995, 2010 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
      table: {
        headers: ["Source", "1995", "2010", "2025"],
        rows: [
          ["Gas", 48.0, 52.0, 38.0],
          ["Electricity", 30.0, 33.0, 40.0],
          ["Oil", 15.0, 9.0, 4.0],
          ["Solar and other renewables", 1.0, 3.0, 14.0],
        ],
      },
    },
    t2: {
      id: 'mt12-t2', category: 'weekly', type: "opinion",
      prompt: "Some people believe that governments should spend more money on developing renewable energy, while others think that the money should be used to help people cope with the effects of climate change. Discuss both views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
    },
  },
};

/** Tra đề theo mã: đề tuần (MTnn) trước, rồi đến kho P01–P18. Trả về null nếu không có. */
export function resolvePaper(rawId: unknown): ResolvedPaper | null {
  const id = String(rawId || '').toUpperCase();
  const w = WEEKLY_PAPERS[id];
  if (w) return { paper: { id, level: 'weekly', focus: w.focus }, t1: w.t1, t2: w.t2 };
  const p = TEST_PAPERS.find(x => x.id === id);
  const t1 = p && TASK1_BANK.find(t => t.id === p.task1Id);
  const t2 = p && TASK2_BANK.find(t => t.id === p.task2Id);
  if (!p || !t1 || !t2) return null;
  return { paper: { id: p.id, level: p.level, focus: p.focus }, t1, t2 };
}

export const WEEKLY_PAPER_IDS = Object.keys(WEEKLY_PAPERS);
