import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer: React.FC = () => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // Target date: April 2nd, 2025 at 9am US Central Time
    const targetDate = new Date('2025-04-02T09:00:00-05:00'); // -05:00 is US Central Time

    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        // Countdown finished
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    // Calculate initial time left
    calculateTimeLeft();
    
    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);
    
    // Clear interval on component unmount
    return () => clearInterval(timer);
  }, []);

  // Format the time values with leading zeros
  const formatTimeValue = (value: number): string => {
    return value < 10 ? `0${value}` : `${value}`;
  };

  return (
    <div className="my-12 text-center">
      <div className="flex justify-center items-center gap-4 md:gap-8">
        <div className="text-center bg-gray-900/50 px-4 py-3 rounded-lg">
          <div className="text-3xl md:text-5xl font-bold">{formatTimeValue(timeLeft.days)}</div>
          <div className="text-xs md:text-sm text-gray-400 uppercase mt-1">{t('countdown.days')}</div>
        </div>
        <div className="text-xl md:text-3xl font-bold">:</div>
        <div className="text-center bg-gray-900/50 px-4 py-3 rounded-lg">
          <div className="text-3xl md:text-5xl font-bold">{formatTimeValue(timeLeft.hours)}</div>
          <div className="text-xs md:text-sm text-gray-400 uppercase mt-1">{t('countdown.hours')}</div>
        </div>
        <div className="text-xl md:text-3xl font-bold">:</div>
        <div className="text-center bg-gray-900/50 px-4 py-3 rounded-lg">
          <div className="text-3xl md:text-5xl font-bold">{formatTimeValue(timeLeft.minutes)}</div>
          <div className="text-xs md:text-sm text-gray-400 uppercase mt-1">{t('countdown.minutes')}</div>
        </div>
        <div className="text-xl md:text-3xl font-bold">:</div>
        <div className="text-center bg-gray-900/50 px-4 py-3 rounded-lg">
          <div className="text-3xl md:text-5xl font-bold">{formatTimeValue(timeLeft.seconds)}</div>
          <div className="text-xs md:text-sm text-gray-400 uppercase mt-1">{t('countdown.seconds')}</div>
        </div>
      </div>
      
      <div className="mt-6 text-gray-400">
        {t('countdown.untilLaunch')}
      </div>
    </div>
  );
};

export default CountdownTimer; 