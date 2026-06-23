import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const DoughnutChart = ({ data, title, height = 300 }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
        }
      },
      title: {
        display: !!title,
        text: title,
        color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
      }
    }
  };

  return (
    <div style={{ height }}>
      <Doughnut options={options} data={data} />
    </div>
  );
};

export default DoughnutChart;