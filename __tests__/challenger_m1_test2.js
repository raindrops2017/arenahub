import mongoose from '../nest-server/node_modules/mongoose/index.js';

const WalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  balance: { type: Number, default: 0 },
}, { timestamps: true });

const WalletModel = mongoose.model('Wallet', WalletSchema);

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/arena_test');
  
  const wallet = await WalletModel.findOne({});
  console.log('Current wallet:', wallet);
  
  const updated1 = await WalletModel.findByIdAndUpdate(wallet._id, { balance: 500 }, { returnDocument: 'after' });
  console.log('Updated with { balance: 500 }:', updated1);

  const updated2 = await WalletModel.findOneAndUpdate({ _id: wallet._id }, { balance: 600 }, { returnDocument: 'after' });
  console.log('Updated findOneAndUpdate with { balance: 600 }:', updated2);

  await mongoose.disconnect();
}

main().catch(console.error);
