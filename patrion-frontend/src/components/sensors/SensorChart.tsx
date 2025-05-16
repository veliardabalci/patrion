import { SensorReading, SensorType } from "@/types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Chart.js kaydı
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SensorChartProps {
  data: SensorReading[];
  type: SensorType;
  title?: string;
}

export default function SensorChart({ data, type, title }: SensorChartProps) {
  // Grafik verileri hazırlama
  const chartData = {
    labels: data.map(item => 
      item && item.timestamp ? 
        new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
    ),
    datasets: [
      {
        label: type === SensorType.TEMPERATURE ? 'Sıcaklık' : 'Nem',
        data: data.map(item => item && typeof item.value === 'number' ? item.value : 0),
        borderColor: type === SensorType.TEMPERATURE ? 'rgb(255, 99, 132)' : 'rgb(53, 162, 235)',
        backgroundColor: type === SensorType.TEMPERATURE ? 'rgba(255, 99, 132, 0.5)' : 'rgba(53, 162, 235, 0.5)',
        tension: 0.3, // Eğri yumuşatma
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: !!title,
        text: title || (type === SensorType.TEMPERATURE ? 'Sıcaklık Değişimi' : 'Nem Değişimi'),
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <Line options={options} data={chartData} />
    </div>
  );
} 