import React, { useState, useEffect } from 'react';

function Loading () {
    const [dots, setDots] = useState([false, false, false]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setDots(prevDots => {
                for (let i = 0; i < prevDots.length; i++) {
                    if (!prevDots[i]) {
                        prevDots[i] = true;
                        break;
                    }

                    if (i === prevDots.length - 1) {
                        prevDots = [true, false, false];
                    }
                }

                return Array.from(prevDots);
            });
        }, 500);

        // 清除定时器
        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="text-2xl">
            {dots.map((dot, index) => (
                <span key={index} className={dot ? '' : 'invisible'}>·</span>
            ))}
        </div>
    );
}

export default Loading;
