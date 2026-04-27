require('./dns-override');
require('dotenv').config();
const mongoose = require('mongoose');
const MessMenu = require('./models/MessMenu');

const weeklyMenu = [
  {
    day: 'Monday',
    meals: [
      { name: 'Breakfast', startTime: '08:00', endTime: '09:30', items: ['Aloo Pyaaz Paratha', 'Boiled Sprouts', 'Bread + Butter', 'Coffee + Tea'] },
      { name: 'Lunch', startTime: '12:30', endTime: '14:00', items: ['Rajma', 'Kofta', 'Rice', 'Roti', 'Mix Raita', 'Salad'] },
      { name: 'Snacks', startTime: '17:00', endTime: '18:00', items: ['Poha', 'Tea'] },
      { name: 'Dinner', startTime: '20:00', endTime: '21:30', items: ['Aloo Sabji', 'Puri', 'Daal Makhani', 'Rice', 'Salad', 'Kheer'] }
    ]
  },
  {
    day: 'Tuesday',
    meals: [
      { name: 'Breakfast', startTime: '08:00', endTime: '09:30', items: ['Pav Bhaji', 'Boiled Sprouts', 'Bread + Jam', 'Bournvita + Milk', 'Tea'] },
      { name: 'Lunch', startTime: '12:30', endTime: '14:00', items: ['Kadhi Pakoda', 'Aloo Jeera', 'Rice', 'Roti', 'Boondi Raita', 'Salad'] },
      { name: 'Snacks', startTime: '17:00', endTime: '18:00', items: ['Chowmein', 'Tea'] },
      { name: 'Dinner', startTime: '20:00', endTime: '21:30', items: ['Sev Tamatar Sabji', 'Chana Daal', 'Rice', 'Roti', 'Salad', 'Gulaab Jamun'] }
    ]
  },
  {
    day: 'Wednesday',
    meals: [
      { name: 'Breakfast', startTime: '08:00', endTime: '09:30', items: ['Aloo Puri', 'Boiled Sprouts', 'Bread + Jam', 'Coffee + Tea'] },
      { name: 'Lunch', startTime: '12:30', endTime: '14:00', items: ['Seasonal Veg', 'Lal Masoor Daal', 'Rice', 'Roti', 'Jeera Raita', 'Salad'] },
      { name: 'Snacks', startTime: '17:00', endTime: '18:00', items: ['Sandwich', 'Tea'] },
      { name: 'Dinner', startTime: '20:00', endTime: '21:30', items: ['Chhole', 'Sabji', 'Rice', 'Roti', 'Salad'] }
    ]
  },
  {
    day: 'Thursday',
    meals: [
      { name: 'Breakfast', startTime: '08:00', endTime: '09:30', items: ['Methi Paratha', 'Dahi', 'Boiled Sprouts', 'Bread + Jam', 'Coffee + Tea'] },
      { name: 'Lunch', startTime: '12:30', endTime: '14:00', items: ['Kaale Chane', 'Sabji', 'Rice', 'Roti', 'Mix Raita', 'Salad', 'Fried Mirchi'] },
      { name: 'Snacks', startTime: '17:00', endTime: '18:00', items: ['Banana', 'Tea'] },
      { name: 'Dinner', startTime: '20:00', endTime: '21:30', items: ['Biryani', 'Dahi', 'Arhar Daal', 'Roti', 'Salad'] }
    ]
  },
  {
    day: 'Friday',
    meals: [
      { name: 'Breakfast', startTime: '08:00', endTime: '09:30', items: ['Idli Sambhar', 'Boiled Egg', 'Banana', 'Boiled Sprouts', 'Bread + Butter', 'Bournvita + Milk', 'Tea'] },
      { name: 'Lunch', startTime: '12:30', endTime: '14:00', items: ['Chhole', 'Puri', 'Rice', 'Roti', 'Chaach', 'Salad', 'Fried Mirchi'] },
      { name: 'Snacks', startTime: '17:00', endTime: '18:00', items: ['Red Sauce Pasta', 'Tea'] },
      { name: 'Dinner', startTime: '20:00', endTime: '21:30', items: ['Mix Veg', 'Daal Tadka', 'Rice', 'Roti', 'Salad'] }
    ]
  },
  {
    day: 'Saturday',
    meals: [
      { name: 'Breakfast', startTime: '08:00', endTime: '09:30', items: ['Medu Vada', 'Boiled Sprouts', 'Bread + Jam', 'Bournvita + Milk', 'Tea'] },
      { name: 'Lunch', startTime: '12:30', endTime: '14:00', items: ['Sabji', 'Mix Daal', 'Rice', 'Roti', 'Boondi Raita', 'Salad'] },
      { name: 'Snacks', startTime: '17:00', endTime: '18:00', items: ['Fruit Chaat', 'Tea'] },
      { name: 'Dinner', startTime: '20:00', endTime: '21:30', items: ['Manchurian', 'Chana Daal', 'Fried Rice', 'Roti', 'Salad', 'Ice Cream'] }
    ]
  },
  {
    day: 'Sunday',
    meals: [
      { name: 'Breakfast', startTime: '08:00', endTime: '09:30', items: ['Chhole Bhature', 'Boiled Sprouts', 'Bread + Butter', 'Coffee + Tea'] },
      { name: 'Lunch', startTime: '12:30', endTime: '14:00', items: ['Fried Rice', 'Sambhar', 'Mix Veg', 'Rice', 'Roti', 'Dahi', 'Salad', 'Fried Mirchi'] },
      { name: 'Snacks', startTime: '17:00', endTime: '18:00', items: ['Samosa', 'Tea'] },
      { name: 'Dinner', startTime: '20:00', endTime: '21:30', items: ['Kadhai Paneer / Egg Curry', 'Rice', 'Roti', 'Daal', 'Salad'] }
    ]
  }
];

async function seedMessMenu() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4, tlsAllowInvalidCertificates: true });

  for (const dayMenu of weeklyMenu) {
    await MessMenu.findOneAndUpdate(
      { day: dayMenu.day },
      { $set: dayMenu },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Seeded ${weeklyMenu.length} days of mess menu.`);
  await mongoose.connection.close();
}

seedMessMenu().catch((err) => {
  console.error(err);
  process.exit(1);
});
