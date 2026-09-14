// Ngân hàng đề IELTS Writing Task 1 + Task 2 cho tính năng "Thi thử Writing".
// Toàn bộ đề tự biên soạn (không sao chép đề thi thật) — dùng để luyện tập ngẫu nhiên,
// có tính giờ, và chấm qua /api/evaluate như một bài chấm bình thường.

export type ChartType = 'bar' | 'line' | 'pie' | 'table' | 'process' | 'map';
export type MapZoneType = 'park' | 'residential' | 'road' | 'school' | 'commercial' | 'water' | 'industrial' | 'other';

export interface MapZone {
  name: string;
  type: MapZoneType;
  x: number; y: number; w: number; h: number; // lưới 12 x 8 đơn vị
  isNew?: boolean; // đánh dấu khu vực mới/thay đổi giữa 2 mốc thời gian
}

export interface Task1Item {
  id: string;
  category: string;
  chartType: ChartType;
  title: string;
  instruction: string;
  unit?: string;
  categories?: string[]; // trục X / nhãn hàng cho bar, line
  series?: { name: string; values: number[] }[]; // cho bar, line (nhiều chuỗi số liệu)
  pies?: { label: string; slices: { label: string; value: number }[] }[]; // 1-2 biểu đồ tròn
  table?: { headers: string[]; rows: (string | number)[][] };
  steps?: string[]; // process diagram
  mapPanels?: { label: string; zones: MapZone[] }[];
  notes?: string[]; // mô tả bổ sung bằng chữ, giúp AI chấm chính xác theo đúng số liệu/thay đổi
}

export interface Task2Item {
  id: string;
  category: string;
  type: 'opinion' | 'discussion' | 'problem-solution' | 'adv-disadv' | 'two-part';
  prompt: string;
}

export const TASK1_BANK: Task1Item[] = [
  // ── BAR CHARTS ──────────────────────────────────────────────
  {
    id: 'bar-01', category: 'education', chartType: 'bar',
    title: 'Chi tiêu cho giáo dục (% GDP), 2000 và 2020',
    instruction: 'The bar chart below shows the percentage of GDP that five countries spent on education in 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    unit: '% GDP',
    categories: ['UK', 'Japan', 'Brazil', 'Kenya', 'Australia'],
    series: [ { name: '2000', values: [4.5, 3.6, 4.0, 5.4, 4.8] }, { name: '2020', values: [5.5, 3.9, 6.1, 4.9, 5.3] } ],
  },
  {
    id: 'bar-02', category: 'technology', chartType: 'bar',
    title: 'Tỷ lệ sở hữu smartphone theo nhóm tuổi, Việt Nam và Hàn Quốc (2023)',
    instruction: 'The chart below shows the percentage of people in different age groups who owned a smartphone in Vietnam and South Korea in 2023. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    unit: '%',
    categories: ['16-24', '25-34', '35-44', '45-54', '55+'],
    series: [ { name: 'Việt Nam', values: [96, 94, 85, 62, 31] }, { name: 'Hàn Quốc', values: [99, 98, 95, 88, 55] } ],
  },
  {
    id: 'bar-03', category: 'environment', chartType: 'bar',
    title: 'Lượng nước tiêu thụ theo ngành, 4 quốc gia',
    instruction: 'The bar chart below shows domestic water consumption by sector in four countries in 2021. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    unit: 'tỷ m3/năm',
    categories: ['Ấn Độ', 'Hoa Kỳ', 'Ai Cập', 'Hà Lan'],
    series: [ { name: 'Nông nghiệp', values: [688, 175, 61, 8] }, { name: 'Công nghiệp', values: [40, 217, 6, 4] }, { name: 'Sinh hoạt', values: [56, 60, 9, 6] } ],
  },
  {
    id: 'bar-04', category: 'travel', chartType: 'bar',
    title: 'Phương tiện đi làm, Amsterdam và Los Angeles',
    instruction: 'The chart below shows the percentage of commuters using different modes of transport to get to work in Amsterdam and Los Angeles. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    unit: '%',
    categories: ['Ô tô', 'Xe buýt', 'Xe đạp', 'Đi bộ'],
    series: [ { name: 'Amsterdam', values: [22, 15, 48, 15] }, { name: 'Los Angeles', values: [76, 9, 3, 12] } ],
  },
  {
    id: 'bar-05', category: 'society', chartType: 'bar',
    title: 'Mức tiêu thụ cà phê và trà theo nhóm tuổi',
    instruction: 'The bar chart below shows the average number of cups of coffee and tea consumed per week by four age groups. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    unit: 'ly/tuần',
    categories: ['18-29', '30-44', '45-59', '60+'],
    series: [ { name: 'Cà phê', values: [9, 12, 10, 6] }, { name: 'Trà', values: [4, 6, 9, 13] } ],
  },
  {
    id: 'bar-06', category: 'environment', chartType: 'bar',
    title: 'Tỷ lệ điện từ năng lượng tái tạo, 2010 và 2022',
    instruction: 'The bar chart below shows the percentage of electricity generated from renewable sources in five countries in 2010 and 2022. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    unit: '%',
    categories: ['Đức', 'Na Uy', 'Trung Quốc', 'Việt Nam', 'Hoa Kỳ'],
    series: [ { name: '2010', values: [17, 97, 19, 3, 10] }, { name: '2022', values: [46, 99, 31, 12, 22] } ],
  },

  // ── LINE CHARTS ─────────────────────────────────────────────
  {
    id: 'line-01', category: 'technology', chartType: 'line',
    title: 'Tỷ lệ dân số sử dụng Internet, 1995-2020',
    instruction: 'The line graph below shows the percentage of the population using the Internet in three countries between 1995 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    unit: '%',
    categories: ['1995', '2000', '2005', '2010', '2015', '2020'],
    series: [ { name: 'Hoa Kỳ', values: [9, 43, 68, 74, 78, 87] }, { name: 'Trung Quốc', values: [0, 2, 8, 34, 50, 70] }, { name: 'Nigeria', values: [0, 0, 4, 24, 47, 60] } ],
  },
  {
    id: 'line-02', category: 'environment', chartType: 'line',
    title: 'Lượng phát thải CO2 bình quân đầu người, 1990-2020',
    instruction: 'The graph below shows average CO2 emissions per person in three regions from 1990 to 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    unit: 'tấn/người',
    categories: ['1990', '2000', '2010', '2020'],
    series: [ { name: 'Bắc Mỹ', values: [19.5, 20.1, 17.2, 14.0] }, { name: 'Châu Âu', values: [9.0, 8.2, 7.5, 6.0] }, { name: 'Đông Nam Á', values: [1.0, 1.5, 2.4, 3.6] } ],
  },
  {
    id: 'line-03', category: 'environment', chartType: 'line',
    title: 'Nhiệt độ trung bình các tháng, hai thành phố',
    instruction: 'The graph below shows average monthly temperatures in two cities over the course of a year. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    unit: '°C',
    categories: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
    series: [ { name: 'Moscow', values: [-6, -5, 1, 8, 15, 19, 21, 19, 13, 6, -1, -5] }, { name: 'Singapore', values: [26, 27, 28, 28, 28, 28, 27, 27, 27, 27, 26, 26] } ],
  },
  {
    id: 'line-04', category: 'society', chartType: 'line',
    title: 'Dân số bốn thành phố, 1980-2020',
    instruction: 'The graph below shows the population of four cities from 1980 to 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    unit: 'triệu người',
    categories: ['1980', '1990', '2000', '2010', '2020'],
    series: [ { name: 'Tokyo', values: [28, 32, 34, 37, 37] }, { name: 'Hà Nội', values: [2.5, 3.1, 4.0, 6.5, 8.2] }, { name: 'Lagos', values: [2.0, 4.8, 7.2, 10.5, 14.3] }, { name: 'São Paulo', values: [12.6, 15.4, 17.0, 19.6, 22.0] } ],
  },
  {
    id: 'line-05', category: 'work', chartType: 'line',
    title: 'Tỷ lệ thất nghiệp, ba quốc gia, 2000-2020',
    instruction: 'The line graph below shows unemployment rates in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    unit: '%',
    categories: ['2000', '2005', '2008', '2010', '2015', '2020'],
    series: [ { name: 'Tây Ban Nha', values: [11, 9, 11, 20, 22, 15], }, { name: 'Đức', values: [8, 11, 7, 7, 4.6, 3.8] }, { name: 'Nhật Bản', values: [4.7, 4.4, 4.0, 5.1, 3.4, 2.8] } ],
  },
  {
    id: 'line-06', category: 'society', chartType: 'line',
    title: 'Doanh số sách in, sách điện tử và sách nói, 2010-2023',
    instruction: 'The graph below shows sales of print books, e-books and audiobooks between 2010 and 2023. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    unit: 'triệu bản',
    categories: ['2010', '2013', '2016', '2019', '2023'],
    series: [ { name: 'Sách in', values: [650, 600, 570, 540, 520] }, { name: 'Sách điện tử', values: [90, 180, 210, 200, 190] }, { name: 'Sách nói', values: [10, 25, 60, 120, 210] } ],
  },

  // ── PIE CHARTS ──────────────────────────────────────────────
  {
    id: 'pie-01', category: 'society', chartType: 'pie',
    title: 'Cơ cấu chi tiêu hộ gia đình, hai quốc gia',
    instruction: 'The pie charts below show the average household expenditure in Country A and Country B. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    pies: [
      { label: 'Country A', slices: [ { label: 'Ăn uống', value: 28 }, { label: 'Nhà ở', value: 30 }, { label: 'Đi lại', value: 15 }, { label: 'Giáo dục', value: 12 }, { label: 'Giải trí', value: 10 }, { label: 'Khác', value: 5 } ] },
      { label: 'Country B', slices: [ { label: 'Ăn uống', value: 18 }, { label: 'Nhà ở', value: 24 }, { label: 'Đi lại', value: 12 }, { label: 'Giáo dục', value: 20 }, { label: 'Giải trí', value: 18 }, { label: 'Khác', value: 8 } ] },
    ],
  },
  {
    id: 'pie-02', category: 'environment', chartType: 'pie',
    title: 'Nguồn sản xuất điện của một quốc gia, 2005 và 2022',
    instruction: 'The pie charts below show the sources of electricity generation in one country in 2005 and 2022. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    pies: [
      { label: '2005', slices: [ { label: 'Than đá', value: 52 }, { label: 'Khí đốt', value: 24 }, { label: 'Hạt nhân', value: 12 }, { label: 'Thủy điện', value: 8 }, { label: 'Tái tạo khác', value: 4 } ] },
      { label: '2022', slices: [ { label: 'Than đá', value: 18 }, { label: 'Khí đốt', value: 22 }, { label: 'Hạt nhân', value: 14 }, { label: 'Thủy điện', value: 10 }, { label: 'Tái tạo khác', value: 36 } ] },
    ],
  },
  {
    id: 'pie-03', category: 'education', chartType: 'pie',
    title: 'Ngành học của sinh viên tốt nghiệp, theo giới tính',
    instruction: 'The pie charts below show the proportion of male and female graduates by field of study at a university in 2022. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    pies: [
      { label: 'Nam', slices: [ { label: 'Kỹ thuật', value: 38 }, { label: 'Kinh doanh', value: 24 }, { label: 'Khoa học', value: 18 }, { label: 'Xã hội & Nhân văn', value: 12 }, { label: 'Khác', value: 8 } ] },
      { label: 'Nữ', slices: [ { label: 'Kỹ thuật', value: 14 }, { label: 'Kinh doanh', value: 26 }, { label: 'Khoa học', value: 20 }, { label: 'Xã hội & Nhân văn', value: 30 }, { label: 'Khác', value: 10 } ] },
    ],
  },
  {
    id: 'pie-04', category: 'environment', chartType: 'pie',
    title: 'Thành phần rác thải sinh hoạt của một thành phố, 2000 và 2020',
    instruction: 'The pie charts below show the composition of household waste in a city in 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    pies: [
      { label: '2000', slices: [ { label: 'Hữu cơ', value: 45 }, { label: 'Nhựa', value: 15 }, { label: 'Giấy', value: 20 }, { label: 'Thủy tinh', value: 10 }, { label: 'Khác', value: 10 } ] },
      { label: '2020', slices: [ { label: 'Hữu cơ', value: 38 }, { label: 'Nhựa', value: 28 }, { label: 'Giấy', value: 14 }, { label: 'Thủy tinh', value: 8 }, { label: 'Khác', value: 12 } ] },
    ],
  },
  // ── TABLES ──────────────────────────────────────────────────
  {
    id: 'table-01', category: 'travel', chartType: 'table',
    title: 'Lượt khách du lịch quốc tế đến 5 quốc gia (nghìn lượt)',
    instruction: 'The table below shows the number of international tourist arrivals (in thousands) in five countries in 2010, 2015 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    table: {
      headers: ['Quốc gia', '2010', '2015', '2020'],
      rows: [ ['Pháp', 77648, 84452, 38556], ['Thái Lan', 15936, 29923, 6702], ['Việt Nam', 5050, 7944, 3837], ['Mexico', 23290, 32093, 24075], ['UAE', 7432, 12296, 5051] ],
    },
  },
  {
    id: 'table-02', category: 'technology', chartType: 'table',
    title: 'Tốc độ và chi phí Internet trung bình, 6 quốc gia',
    instruction: 'The table below shows average internet speed and monthly cost in six countries in 2023. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    table: {
      headers: ['Quốc gia', 'Tốc độ (Mbps)', 'Chi phí (USD/tháng)'],
      rows: [ ['Singapore', 260, 38], ['Hàn Quốc', 210, 22], ['Việt Nam', 90, 10], ['Hoa Kỳ', 150, 68], ['Đức', 105, 40], ['Ấn Độ', 55, 8] ],
    },
  },
  {
    id: 'table-03', category: 'health', chartType: 'table',
    title: 'Tuổi thọ trung bình theo giới tính, 5 quốc gia',
    instruction: 'The table below shows male and female life expectancy in five countries in 1990 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    table: {
      headers: ['Quốc gia', 'Nam 1990', 'Nữ 1990', 'Nam 2020', 'Nữ 2020'],
      rows: [ ['Nhật Bản', 75.9, 81.9, 81.6, 87.7], ['Việt Nam', 65.0, 70.0, 71.3, 80.5], ['Nigeria', 46.0, 49.0, 53.4, 55.7], ['Hoa Kỳ', 71.8, 78.8, 76.3, 81.4], ['Nga', 63.8, 74.3, 68.2, 78.0] ],
    },
  },
  {
    id: 'table-04', category: 'health', chartType: 'table',
    title: 'Tỷ lệ tham gia thể thao theo nhóm tuổi (%)',
    instruction: 'The table below shows the percentage of people in different age groups who regularly participate in five sports. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    table: {
      headers: ['Môn thể thao', '16-24', '25-44', '45-64', '65+'],
      rows: [ ['Bơi lội', 32, 24, 18, 12], ['Chạy bộ', 40, 30, 15, 5], ['Cầu lông', 28, 22, 20, 10], ['Yoga', 15, 26, 24, 18], ['Bóng đá', 45, 20, 6, 1] ],
    },
  },

  // ── PROCESS DIAGRAMS ────────────────────────────────────────
  {
    id: 'process-01', category: 'environment', chartType: 'process',
    title: 'Quy trình tái chế chai nhựa',
    instruction: 'The diagram below shows the process by which plastic bottles are recycled. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    steps: [
      'Thu gom chai nhựa đã qua sử dụng từ hộ gia đình và thùng rác công cộng',
      'Vận chuyển đến nhà máy phân loại',
      'Phân loại theo màu sắc và loại nhựa',
      'Rửa sạch để loại bỏ nhãn, keo và tạp chất',
      'Nghiền nhỏ thành mảnh vụn (flakes)',
      'Nung chảy và ép thành hạt nhựa tái sinh (pellets)',
      'Sử dụng hạt nhựa để sản xuất sản phẩm mới (quần áo, chai mới, đồ nội thất)',
    ],
    notes: ['Đây là một quy trình khép kín (cyclic): sản phẩm mới có thể lại trở thành nguyên liệu tái chế sau khi sử dụng.'],
  },
  {
    id: 'process-02', category: 'other', chartType: 'process',
    title: 'Quy trình sản xuất nước cam đóng hộp',
    instruction: 'The diagram below shows how orange juice is produced for sale in supermarkets. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    steps: [
      'Thu hoạch cam tại vườn',
      'Vận chuyển về nhà máy và rửa sạch',
      'Phân loại theo kích cỡ và chất lượng',
      'Ép lấy nước cam',
      'Lọc bỏ hạt và bã',
      'Thanh trùng bằng nhiệt để diệt khuẩn',
      'Đóng hộp/chai và dán nhãn',
      'Phân phối đến siêu thị',
    ],
    notes: ['Đây là quy trình một chiều (linear), có điểm bắt đầu và điểm kết thúc rõ ràng, không lặp lại.'],
  },
  // ── MAPS (sơ đồ minh họa) ───────────────────────────────────
  {
    id: 'map-01', category: 'society', chartType: 'map',
    title: 'Sự thay đổi của thị trấn Riverbank, 1995 và hiện nay',
    instruction: 'The maps below show the town of Riverbank in 1995 and today. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    mapPanels: [
      { label: '1995', zones: [
        { name: 'Sông', type: 'water', x: 0, y: 0, w: 12, h: 1.2 },
        { name: 'Công viên', type: 'park', x: 0.5, y: 1.5, w: 3, h: 2.5 },
        { name: 'Trường học', type: 'school', x: 4, y: 1.5, w: 2, h: 2 },
        { name: 'Khu dân cư', type: 'residential', x: 7, y: 1.5, w: 4.5, h: 3 },
        { name: 'Đường chính', type: 'road', x: 0, y: 5, w: 12, h: 0.8 },
        { name: 'Đất trống', type: 'other', x: 0.5, y: 6, w: 6, h: 1.5 },
      ] },
      { label: 'Hiện nay', zones: [
        { name: 'Sông', type: 'water', x: 0, y: 0, w: 12, h: 1.2 },
        { name: 'Công viên', type: 'park', x: 0.5, y: 1.5, w: 2, h: 2.5 },
        { name: 'Trường học', type: 'school', x: 3, y: 1.5, w: 2, h: 2 },
        { name: 'Khu dân cư', type: 'residential', x: 7, y: 1.5, w: 4.5, h: 3 },
        { name: 'Trung tâm thương mại', type: 'commercial', x: 5.2, y: 1.5, w: 1.6, h: 2, isNew: true },
        { name: 'Đường chính', type: 'road', x: 0, y: 5, w: 12, h: 0.8 },
        { name: 'Khu chung cư mới', type: 'residential', x: 0.5, y: 6, w: 6, h: 1.5, isNew: true },
      ] },
    ],
    notes: [
      'Khu đất trống phía nam đường chính (1995) đã được xây thành khu chung cư mới.',
      'Một trung tâm thương mại mới xuất hiện giữa trường học và khu dân cư.',
      'Công viên bị thu hẹp diện tích để nhường chỗ cho trung tâm thương mại.',
      'Sông, đường chính và vị trí khu dân cư ban đầu được giữ nguyên.',
    ],
  },
  {
    id: 'map-02', category: 'education', chartType: 'map',
    title: 'Khuôn viên trường Đại học Green Hill trước và sau cải tạo',
    instruction: 'The maps below show Green Hill University campus before and after redevelopment. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    mapPanels: [
      { label: 'Trước cải tạo', zones: [
        { name: 'Thư viện', type: 'school', x: 1, y: 1, w: 3, h: 2 },
        { name: 'Ký túc xá', type: 'residential', x: 5, y: 1, w: 3, h: 2 },
        { name: 'Sân thể thao', type: 'park', x: 1, y: 4, w: 4, h: 2.5 },
        { name: 'Căng tin', type: 'commercial', x: 6, y: 4, w: 2, h: 1.5 },
        { name: 'Bãi đất trống', type: 'other', x: 8.5, y: 1, w: 3, h: 5.5 },
      ] },
      { label: 'Sau cải tạo', zones: [
        { name: 'Thư viện', type: 'school', x: 1, y: 1, w: 3, h: 2 },
        { name: 'Ký túc xá', type: 'residential', x: 5, y: 1, w: 3, h: 2 },
        { name: 'Sân thể thao', type: 'park', x: 1, y: 4, w: 2.5, h: 2.5 },
        { name: 'Căng tin', type: 'commercial', x: 6, y: 4, w: 2, h: 1.5 },
        { name: 'Khu bãi đỗ xe', type: 'road', x: 3.7, y: 4, w: 1.8, h: 2.5, isNew: true },
        { name: 'Tòa nhà Khoa học mới', type: 'school', x: 8.5, y: 1, w: 3, h: 5.5, isNew: true },
      ] },
    ],
    notes: [
      'Bãi đất trống phía đông khuôn viên đã được xây thành Tòa nhà Khoa học mới.',
      'Một phần sân thể thao được thu hẹp để làm bãi đỗ xe mới.',
      'Thư viện, ký túc xá và căng tin giữ nguyên vị trí.',
    ],
  },
];

export const TASK2_BANK: Task2Item[] = [
  // ── OPINION (agree/disagree) ───────────────────────────────
  { id: 't2-op-01', category: 'technology', type: 'opinion', prompt: 'Modern technology has reduced the amount of face-to-face communication between people. To what extent do you agree or disagree?' },
  { id: 't2-op-02', category: 'education', type: 'opinion', prompt: 'Some people believe that university education should be free for all students. To what extent do you agree or disagree?' },
  { id: 't2-op-03', category: 'education', type: 'opinion', prompt: 'Children should begin learning a foreign language as early as possible rather than waiting until secondary school. To what extent do you agree or disagree?' },
  { id: 't2-op-04', category: 'work', type: 'opinion', prompt: 'Working from home is more productive than working in a traditional office. To what extent do you agree or disagree?' },
  { id: 't2-op-05', category: 'government', type: 'opinion', prompt: 'Governments should spend more money on improving public transport than on building new roads. To what extent do you agree or disagree?' },
  { id: 't2-op-06', category: 'society', type: 'opinion', prompt: 'Successful people are born with certain talents, not made through effort and hard work. To what extent do you agree or disagree?' },
  { id: 't2-op-07', category: 'environment', type: 'opinion', prompt: 'Zoos are unnecessary and cruel to animals, and should therefore be closed down. To what extent do you agree or disagree?' },
  { id: 't2-op-08', category: 'media', type: 'opinion', prompt: 'Social media does more harm than good to society. To what extent do you agree or disagree?' },
  // ── DISCUSSION (discuss both views) ────────────────────────
  { id: 't2-di-01', category: 'education', type: 'discussion', prompt: 'Some people think students should study a wide range of subjects at school, while others believe they should specialise in a few subjects from an early age. Discuss both views and give your own opinion.' },
  { id: 't2-di-02', category: 'society', type: 'discussion', prompt: 'Some people prefer to live in a big city, while others believe life in the countryside is better. Discuss both views and give your own opinion.' },
  { id: 't2-di-03', category: 'crime', type: 'discussion', prompt: 'Some people think that punishment is the best way to deal with young offenders, while others believe education and rehabilitation are more effective. Discuss both views and give your own opinion.' },
  { id: 't2-di-04', category: 'crime', type: 'discussion', prompt: 'Some people believe that longer prison sentences are the best way to reduce crime, while others think there are better alternatives. Discuss both views and give your own opinion.' },
  { id: 't2-di-05', category: 'media', type: 'discussion', prompt: 'Some people think advertising is a positive force in the economy, while others believe it has a negative effect on society. Discuss both views and give your own opinion.' },
  { id: 't2-di-06', category: 'society', type: 'discussion', prompt: 'Some people believe artists should be completely free to create whatever they want, while others think there should be limits on artistic expression. Discuss both views and give your own opinion.' },
  // ── PROBLEM-SOLUTION ────────────────────────────────────────
  { id: 't2-ps-01', category: 'travel', type: 'problem-solution', prompt: 'Traffic congestion is becoming a serious problem in many major cities around the world. What are the causes of this problem, and what measures could be taken to solve it?' },
  { id: 't2-ps-02', category: 'health', type: 'problem-solution', prompt: 'Obesity rates among children are increasing rapidly in many countries. What are the causes of this trend, and what can be done to address it?' },
  { id: 't2-ps-03', category: 'environment', type: 'problem-solution', prompt: 'Many animal and plant species are facing extinction as a result of human activity. What are the reasons for this, and what measures could governments and individuals take to protect endangered species?' },
  { id: 't2-ps-04', category: 'society', type: 'problem-solution', prompt: 'In many major cities, there is a serious shortage of affordable housing. What are the causes of this problem, and what solutions can you suggest?' },
  { id: 't2-ps-05', category: 'technology', type: 'problem-solution', prompt: 'Cybercrime is becoming an increasingly serious problem as more of our lives move online. What problems does this cause, and what can be done to reduce cybercrime?' },
  { id: 't2-ps-06', category: 'environment', type: 'problem-solution', prompt: 'Plastic pollution in the oceans is a growing environmental problem. What are the main causes of this issue, and what solutions would you suggest?' },
  // ── ADVANTAGES / DISADVANTAGES ──────────────────────────────
  { id: 't2-ad-01', category: 'work', type: 'adv-disadv', prompt: 'An increasing number of people are choosing to work remotely rather than in a traditional office. What are the advantages and disadvantages of this trend?' },
  { id: 't2-ad-02', category: 'travel', type: 'adv-disadv', prompt: 'Some countries are experiencing a rapid increase in tourism. What are the advantages and disadvantages of this development for these countries?' },
  { id: 't2-ad-03', category: 'technology', type: 'adv-disadv', prompt: 'Online shopping is increasingly replacing shopping in physical stores. What are the advantages and disadvantages of this development?' },
  { id: 't2-ad-04', category: 'education', type: 'adv-disadv', prompt: 'More students are choosing to study at universities in foreign countries. What are the advantages and disadvantages of studying abroad?' },
  { id: 't2-ad-05', category: 'work', type: 'adv-disadv', prompt: 'Artificial intelligence is increasingly being used to perform tasks in the workplace. What are the advantages and disadvantages of this development?' },
  { id: 't2-ad-06', category: 'media', type: 'adv-disadv', prompt: 'Many teenagers today spend a large amount of time using social media. What are the advantages and disadvantages of this for young people?' },
  // ── TWO-PART QUESTION ────────────────────────────────────────
  { id: 't2-tp-01', category: 'work', type: 'two-part', prompt: 'Why do many people today prefer to be self-employed rather than work for an employer? What skills or qualities are needed to become successfully self-employed?' },
  { id: 't2-tp-02', category: 'society', type: 'two-part', prompt: 'Why has there been an increasing interest in researching family history and genealogy in recent years? Is this a positive or negative trend?' },
  { id: 't2-tp-03', category: 'health', type: 'two-part', prompt: 'What are the main causes of stress among young people today? What can be done to help them manage this stress?' },
  { id: 't2-tp-04', category: 'work', type: 'two-part', prompt: 'Why do some people choose careers with high salaries even when they dislike the job itself? Do you think this is a wise choice?' },
];

// Chọn ngẫu nhiên 1 đề, tránh lặp lại các id vừa làm gần đây (nếu đã làm hết ngân hàng thì cho phép lặp lại).
export function pickRandom<T extends { id: string }>(bank: T[], excludeIds: string[] = []): T {
  const pool = bank.filter(t => !excludeIds.includes(t.id));
  const list = pool.length ? pool : bank;
  return list[Math.floor(Math.random() * list.length)];
}

// Chuyển dữ liệu Task 1 (bảng số liệu, biểu đồ, sơ đồ) thành mô tả dạng chữ đầy đủ,
// để gửi cho AI chấm bài (/api/evaluate) đánh giá đúng độ chính xác số liệu mà không cần ảnh.
export function task1ToText(t: Task1Item): string {
  const lines: string[] = [t.instruction, '', `[${t.title}]`];
  if (t.categories && t.series) {
    if (t.unit) lines.push(`Đơn vị: ${t.unit}`);
    lines.push(['', ...t.categories].join(' | '));
    t.series.forEach(s => lines.push([s.name, ...s.values].join(' | ')));
  }
  if (t.pies) {
    t.pies.forEach(p => {
      lines.push(`${p.label}:`);
      p.slices.forEach(sl => lines.push(`  - ${sl.label}: ${sl.value}%`));
    });
  }
  if (t.table) {
    lines.push(t.table.headers.join(' | '));
    t.table.rows.forEach(r => lines.push(r.join(' | ')));
  }
  if (t.steps) {
    lines.push('Các bước trong quy trình:');
    t.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }
  if (t.mapPanels) {
    t.mapPanels.forEach(p => {
      lines.push(`${p.label}: ${p.zones.map(z => z.name + (z.isNew ? ' (mới/thay đổi)' : '')).join('; ')}`);
    });
  }
  if (t.notes?.length) {
    lines.push('', 'Ghi chú số liệu/thay đổi chính xác:');
    t.notes.forEach(n => lines.push(`- ${n}`));
  }
  return lines.join('\n');
}
