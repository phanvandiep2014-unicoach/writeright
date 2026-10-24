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
    focus: 'UNICOACH Weekly 3 (01/11/2026): Task 1 bảng giờ giải trí theo nhóm tuổi; Task 2 sống một mình.',
    t1: {
      id: 'mt03-t1', category: 'lifestyle', chartType: 'table',
      title: 'Số giờ giải trí mỗi tuần theo nhóm tuổi, 2024',
      instruction: 'The table below shows the average number of hours per week that people in four age groups spent on three leisure activities in 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
      table: {
        headers: ['Age group', 'Watching streaming video (hours/week)', 'Playing video games (hours/week)', 'Reading books (hours/week)'],
        rows: [
          ['16–24', 14, 11, 2],
          ['25–39', 12, 6, 3],
          ['40–59', 10, 3, 5],
          ['60 and over', 9, 2, 8],
        ],
      },
    },
    t2: {
      id: 'mt03-t2', category: 'society', type: 'discussion',
      prompt: 'In many countries, a growing number of people live alone. Some people think this is a positive development, while others believe it is a negative one. Discuss both these views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
    },
  },
  MT04: {
    focus: 'UNICOACH Weekly 4 (08/11/2026): Task 1 bảng chi tiêu hộ gia đình; Task 2 giao thông công cộng so với đường mới.',
    t1: {
      id: 'mt04-t1', category: 'economy', chartType: 'table',
      title: 'Chi tiêu hằng tuần của hộ gia đình (£), 2005 và 2025',
      instruction: 'The table below shows the average weekly spending of households in one country on five items in 2005 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
      table: {
        headers: ['Item', '2005 (£ per week)', '2025 (£ per week)'],
        rows: [
          ['Housing', 168, 245],
          ['Food', 96, 104],
          ['Transport', 82, 71],
          ['Entertainment', 54, 88],
          ['Clothing', 31, 22],
        ],
      },
    },
    t2: {
      id: 'mt04-t2', category: 'transport', type: 'opinion',
      prompt: 'Some people believe that governments should spend money on improving public transport rather than building new roads. To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
    },
  },
  MT05: {
    focus: 'UNICOACH Weekly 5 (15/11/2026): Task 1 bảng tỷ lệ dùng internet; Task 2 trẻ em dùng màn hình.',
    t1: {
      id: 'mt05-t1', category: 'technology', chartType: 'table',
      title: 'Tỷ lệ dân số dùng internet theo khu vực (%), 2010–2020',
      instruction: 'The table below shows the percentage of the population who used the internet in four regions in 2010, 2015 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
      table: {
        headers: ['Region', '2010 (%)', '2015 (%)', '2020 (%)'],
        rows: [
          ['North America', 77, 85, 90],
          ['Europe', 67, 78, 87],
          ['Asia', 24, 40, 62],
          ['Africa', 10, 19, 33],
        ],
      },
    },
    t2: {
      id: 'mt05-t2', category: 'technology', type: 'problem-solution',
      prompt: 'Many children now spend several hours a day looking at screens, such as phones, tablets and televisions. What problems does this cause, and what can be done to solve them? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
    },
  },
  MT06: {
    focus: 'UNICOACH Weekly 6 (22/11/2026): Task 1 bảng lượt khách bảo tàng; Task 2 làm việc tại nhà.',
    t1: {
      id: 'mt06-t1', category: 'culture', chartType: 'table',
      title: 'Lượt khách đến bốn bảo tàng (triệu), 2015 và 2025',
      instruction: 'The table below shows the number of visitors, in millions, to four museums in one city in 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
      table: {
        headers: ['Museum', '2015 (millions)', '2025 (millions)'],
        rows: [
          ['Natural History Museum', 4.9, 5.6],
          ['Art Gallery', 5.9, 4.2],
          ['History Museum', 3.1, 3.8],
          ['Maritime Museum', 1.2, 2.0],
        ],
      },
    },
    t2: {
      id: 'mt06-t2', category: 'work', type: 'adv-disadv',
      prompt: 'More and more people are working from home instead of travelling to an office. Do the advantages of this trend outweigh the disadvantages? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
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
