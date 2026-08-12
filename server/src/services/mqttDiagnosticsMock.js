export const ioList = [
    // --- INPUTS ---
    { id: 1, name: 'Coin Push Button', type: 'Digital Input', voltage: '12V DC', description: 'Coin Push Button Signal' },
    { id: 2, name: 'Coin Acceptor', type: 'Digital Input', voltage: '12V DC', description: 'Coin Acceptor Pulse Signal' },
    { id: 7, name: 'Door Limit Switch', type: 'Digital Input', voltage: '12V DC', description: 'Door Open/Close Status' },
    { id: 5, name: 'PIR Sensor', type: 'Digital Input', voltage: '12V DC', description: 'Motion Detection Input' },
    { id: 3, name: 'Flush Push Button', type: 'Digital Input', voltage: '12V DC', description: 'Flush Push Button Signal' },
    { id: 4, name: 'Emergency Push Button', type: 'Digital Input', voltage: '12V DC', description: 'Emergency Button Signal' },
    { id: 19, name: 'RFID Push Button', type: 'Digital Input', voltage: '12V DC', description: 'RFID Card / Button Signal' },
    { id: 6, name: 'Water Level Sensor', type: 'Digital Input', voltage: '12V DC', description: 'Water Tank Level Input' },
    { id: 20, name: 'Extra Input 2', type: 'Digital Input', voltage: '12V DC', description: 'Spare Input Terminal 2' },

    // --- OUTPUTS ---
    { id: 13, name: 'Green Indicator', type: 'Digital Output', voltage: '230V AC', description: 'Vacant Indicator' },
    { id: 12, name: 'Red Indicator', type: 'Digital Output', voltage: '230V AC', description: 'Busy Indicator' },
    { id: 18, name: 'Coin Acceptor Control', type: 'Digital Output', voltage: '12V DC', description: 'Coin Acceptor Power ON/OFF' },
    { id: 14, name: 'Round Light', type: 'Digital Output', voltage: '230V AC', description: 'Toilet Light Control' },
    { id: 15, name: 'Fan', type: 'Digital Output', voltage: '230V AC', description: 'Exhaust Fan Control' },
    { id: 9, name: 'Flush Valve', type: 'Digital Output', voltage: '12V DC', description: 'Flush Valve Control' },
    { id: 8, name: 'Door Lock', type: 'Digital Output', voltage: '12V DC', description: 'Door Lock Control' },
    { id: 10, name: 'Floor Valve', type: 'Digital Output', voltage: '12V DC', description: 'Floor Cleaning Valve Control' },
    { id: 11, name: 'Sprinkler Valve', type: 'Digital Output', voltage: '12V DC', description: 'Sprinkler Valve Control' },
    { id: 16, name: 'Buzzer', type: 'Digital Output', voltage: '230V AC', description: 'Audio Alert Control' },
    { id: 17, name: 'Motor (0.5 HP)', type: 'Digital Output', voltage: '230V AC', description: 'Water Pump Motor Control' }
];

export const getIOList = () => ioList;

export const sendMQTTCommand = async (machineId, ioName, state) => {
    return new Promise((resolve, reject) => {
        // Simulate network delay for MQTT payload publish
        setTimeout(() => {
            console.log(`[MQTT MOCK] Publishing to machine/${machineId}/cmd: ${ioName} -> ${state ? 'ON' : 'OFF'}`);
            
            // Simulate 10% chance of hardware fault/no acknowledgement
            const faultChance = Math.random();
            if (faultChance < 0.1) {
                console.log(`[MQTT MOCK] Hardware fault detected for ${ioName}`);
                return reject(new Error(`Hardware Fault Detected: ${ioName} is unresponsive or malfunctioning.`));
            }
            resolve({ success: true, message: 'Command acknowledged by hardware.' });
        }, 500);
    });
};
