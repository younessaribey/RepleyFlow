# 🤖 AI Integration - GPT-4o Mini

**Status**: ✅ **IMPLEMENTED**  
**Model**: GPT-4o mini  
**Provider**: OpenAI

---

## 🎯 Overview

The backend now includes intelligent conversation handling powered by GPT-4o mini. When customers send WhatsApp messages, the AI automatically:

1. **Reads** the customer's message
2. **Understands** the context (order details, conversation history)
3. **Generates** an appropriate reply
4. **Sends** the response back to the customer

All of this happens **automatically** without human intervention!

---

## ✨ Features

### 1. Context-Aware Responses
- **Order Information**: AI knows the order ID, total amount, wilaya, and status
- **Customer Name**: Personalizes responses with customer's name
- **Conversation History**: Remembers previous messages (last 10)

### 2. Multi-Language Support
- **Arabic**: يفهم ويرد بالعربية
- **French**: Comprend et répond en français
- **English**: Understands and responds in English
- AI automatically detects and responds in the customer's language

### 3. Smart Conversation Handling
- Order status inquiries
- Delivery time questions
- Address changes
- Order cancellations
- General questions

### 4. Professional Tone
- Polite and helpful
- Concise (2-3 sentences max)
- Honest when uncertain
- Escalates complex issues to human agents

---

## 🔧 Setup

### 1. Get OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-...`)

### 2. Add to Environment

Edit your `.env` file:

```env
OPENAI_API_KEY=sk-your-actual-key-here
```

### 3. Restart Backend

```bash
pkill -f "nest start"
cd /Users/mac/Documents/GitHub/ReplyFlow/backend
npm run start:dev
```

---

## 🧪 Testing

### Quick Test

```bash
cd /Users/mac/Documents/GitHub/ReplyFlow/backend
./test-ai-conversation.sh
```

**What it does**:
- Simulates a customer asking: "Hello, when will my order arrive?"
- AI generates and sends a reply
- Shows the conversation

**Expected output**:
```
💬 Latest Conversation:

   🤖 Bot: Template: jaspers_market_plain_text_v1
   👤 Customer: Hello, when will my order arrive?
   🤖 Bot: Your order will be delivered within 2-3 business days to Alger. You'll receive a call from our delivery partner soon!

✅ SUCCESS! AI replied automatically
```

### Manual Test

1. **Start monitoring**:
   ```bash
   ./monitor-webhooks.sh
   ```

2. **Send WhatsApp message** from your phone to `+1 555 164 1641`:
   - "When will my order arrive?"
   - "Can I change my address?"
   - "I want to cancel my order"

3. **Watch logs** for AI activity:
   ```
   🤖 Generating AI reply...
   🤖 AI reply: Your order will be delivered...
   ✅ AI reply sent successfully
   ```

4. **Check your WhatsApp** - you should receive an automatic reply!

---

## 📊 How It Works

### Flow Diagram

```
Customer sends message
         ↓
WhatsApp → Meta Webhook → Your Backend
         ↓
Store message in database
         ↓
Get conversation history (last 10 messages)
         ↓
Build context (order details + history)
         ↓
Call GPT-4o mini API
         ↓
Generate intelligent reply
         ↓
Send reply via WhatsApp API
         ↓
Store reply in database
         ↓
Customer receives response
```

### System Prompt

The AI is instructed to:

```
You are a helpful customer service assistant for an Algerian 
e-commerce store that handles Cash on Delivery (COD) orders.

Your role:
- Answer customer questions about their orders
- Confirm order details
- Provide delivery information
- Handle order modifications
- Be polite, professional, and concise
- Respond in the same language as the customer
- Keep responses short (2-3 sentences max)

Current order context:
- Order ID: 12345678
- Total Amount: 2500 DZD
- Wilaya: Alger
- Status: PENDING_CONFIRMATION
```

---

## 💡 Example Conversations

### Example 1: Delivery Inquiry (French)

**Customer**: "Bonjour, quand est-ce que ma commande va arriver?"

**AI**: "Bonjour! Votre commande sera livrée dans 2-3 jours ouvrables à Alger. Notre partenaire de livraison vous contactera bientôt pour confirmer l'adresse."

### Example 2: Order Status (Arabic)

**Customer**: "السلام عليكم، أين طلبي؟"

**AI**: "وعليكم السلام! طلبك رقم 12345678 قيد المعالجة. سيتم توصيله إلى ولاية الجزائر خلال 2-3 أيام عمل."

### Example 3: Address Change (English)

**Customer**: "Can I change my delivery address?"

**AI**: "Yes, you can! Please provide your new address and we'll update your order. Make sure to include the wilaya."

### Example 4: Cancellation

**Customer**: "I want to cancel my order"

**AI**: "I understand. I'll process your cancellation request. A human agent will contact you shortly to confirm."

---

## 🔍 Monitoring

### Check AI Activity in Logs

```bash
tail -f /tmp/nest-startup.log | grep -E '(🤖|AI|OpenAI)'
```

**You'll see**:
```
🤖 Generating AI reply...
🤖 AI reply: Your order will be delivered within 2-3 business days...
✅ AI reply sent successfully
```

### Check Conversation in Database

```bash
./test-inbound-messages.sh
```

**Shows**:
- All inbound messages (customer)
- All outbound messages (bot + templates)
- Message content and timestamps

---

## ⚙️ Configuration

### AI Service Settings

Located in: `src/modules/ai/ai.service.ts`

**Current settings**:
```typescript
{
  model: 'gpt-4o-mini',        // Fast and cost-effective
  temperature: 0.7,             // Balanced creativity
  max_tokens: 300,              // ~2-3 sentences
}
```

### Conversation History

**Default**: Last 10 messages

To change:
```typescript
// In whatsapp.service.ts
const conversationHistory = await this.aiService.getConversationHistory(
  order.id,
  20  // Change from 10 to 20
);
```

### System Prompt Customization

Edit `buildSystemPrompt()` in `src/modules/ai/ai.service.ts` to:
- Change tone (more formal/casual)
- Add specific instructions
- Include business policies
- Add product information

---

## 💰 Cost Estimation

### GPT-4o Mini Pricing (as of Nov 2024)

- **Input**: $0.150 / 1M tokens
- **Output**: $0.600 / 1M tokens

### Example Calculation

**Per conversation** (average):
- Input: ~500 tokens (context + history)
- Output: ~100 tokens (response)
- **Cost**: ~$0.00015 per conversation

**1000 conversations**:
- Cost: ~$0.15 (15 cents)

**10,000 conversations/month**:
- Cost: ~$1.50/month

Very affordable! 🎉

---

## 🚀 Advanced Features

### 1. Custom Instructions per Store

You can customize AI behavior per store by adding fields to the `Store` model:

```prisma
model Store {
  // ... existing fields
  aiInstructions String? // Custom AI instructions
  aiEnabled      Boolean @default(true)
}
```

### 2. Human Handoff

AI automatically escalates complex issues:

```typescript
if (customerMessage.includes('speak to manager')) {
  return 'I understand you'd like to speak with a manager. A human agent will contact you within 1 hour.';
}
```

### 3. Order Actions

AI can trigger actions:

```typescript
if (aiReply.includes('CANCEL_ORDER')) {
  await this.ordersService.cancelOrder(order.id);
}
```

### 4. Sentiment Analysis

Detect frustrated customers:

```typescript
const sentiment = await this.aiService.analyzeSentiment(customerMessage);
if (sentiment === 'negative') {
  // Notify human agent
  await this.notifyAgent(order.id, 'Customer seems frustrated');
}
```

---

## 🐛 Troubleshooting

### AI Not Responding

**Check**:
1. Is `OPENAI_API_KEY` set in `.env`?
   ```bash
   grep OPENAI_API_KEY .env
   ```

2. Is backend running?
   ```bash
   curl http://localhost:3000/api/whatsapp/webhook
   ```

3. Check logs for errors:
   ```bash
   tail -50 /tmp/nest-startup.log | grep -i error
   ```

### API Key Invalid

**Error**: `401 Unauthorized`

**Fix**:
- Get a fresh API key from OpenAI
- Make sure it starts with `sk-`
- Update `.env` and restart backend

### Rate Limit Exceeded

**Error**: `429 Too Many Requests`

**Fix**:
- OpenAI has rate limits
- Add retry logic with exponential backoff
- Consider upgrading OpenAI plan

### Slow Responses

**Issue**: AI takes 3-5 seconds to respond

**This is normal**:
- GPT-4o mini typically responds in 2-4 seconds
- Network latency adds 0.5-1 second
- Total: 3-5 seconds is expected

**To improve**:
- Use streaming (not implemented yet)
- Cache common responses
- Reduce `max_tokens`

---

## 📈 Metrics & Analytics

### Track AI Performance

Add to `AiService`:

```typescript
async generateReply(...) {
  const startTime = Date.now();
  
  const reply = await this.openai.chat.completions.create(...);
  
  const duration = Date.now() - startTime;
  this.logger.log(`AI response time: ${duration}ms`);
  
  // Store metrics in database
  await this.prisma.aiMetric.create({
    data: { duration, model: 'gpt-4o-mini', ... }
  });
  
  return reply;
}
```

---

## 🎉 Benefits

### For Merchants
- ✅ **24/7 Support**: AI never sleeps
- ✅ **Instant Responses**: No customer waiting
- ✅ **Cost Savings**: Reduce support staff
- ✅ **Scalable**: Handle 1000s of conversations

### For Customers
- ✅ **Fast Replies**: Immediate answers
- ✅ **Always Available**: Any time, any day
- ✅ **Consistent**: Same quality every time
- ✅ **Multi-Language**: Arabic, French, English

---

## 🔐 Security & Privacy

### Data Handling
- Customer messages are sent to OpenAI
- OpenAI does NOT train on your data (API usage)
- Messages are stored in your database
- Conversation history is private per order

### Best Practices
- Don't include sensitive data in prompts (credit cards, passwords)
- Use environment variables for API keys
- Rotate API keys regularly
- Monitor usage for anomalies

---

## 📚 Resources

- **OpenAI API Docs**: https://platform.openai.com/docs
- **GPT-4o Mini**: https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/
- **Pricing**: https://openai.com/api/pricing/
- **Best Practices**: https://platform.openai.com/docs/guides/prompt-engineering

---

## ✅ Summary

Your WhatsApp bot now has **AI superpowers**! 🚀

- ✅ Automatically reads customer messages
- ✅ Understands context (order, history)
- ✅ Generates intelligent replies
- ✅ Responds in customer's language
- ✅ Handles common questions
- ✅ Escalates complex issues

**Just add your OpenAI API key and it works!**

---

**Ready to test?**

```bash
./test-ai-conversation.sh
```

🎉 **Your customers will love the instant, intelligent responses!**

