// netlify/functions/deepseek-assistant.js
export async function handler(event) {
  console.log('收到AI助手请求');
  
  // CORS处理
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const { message, language = 'zh', systemPrompt } = JSON.parse(event.body || '{}');
    
    if (!message) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        },
        body: JSON.stringify({ error: 'Message is required' })
      };
    }
    
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        },
        body: JSON.stringify({ 
          reply: language === 'zh' 
            ? 'AI服务配置错误：请检查API密钥设置。'
            : 'AI service configuration error: Please check API key settings.',
          error: true 
        })
      };
    }
    
    // 优化系统提示词
    const finalSystemPrompt = systemPrompt || (language === 'zh' 
      ? '你是DeepSeek学习助手，专门解答大语言模型相关问题。回答要简洁、准确、有帮助。用中文回答。'
      : 'You are a DeepSeek learning assistant specializing in LLM topics. Be concise, accurate, and helpful. Answer in English.');
    
    // 设置超时控制器
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25秒超时
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 800,
        temperature: 0.7,
        stream: false
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 
      (language === 'zh' ? '抱歉，我暂时无法回答这个问题。' : 'Sorry, I cannot answer this question.');
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      },
      body: JSON.stringify({
        reply,
        language,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('助手函数错误:', error);
    
    // 从请求中获取语言
    let language = 'zh';
    try {
      const body = JSON.parse(event.body || '{}');
      language = body.language || 'zh';
    } catch (e) {}
    
    const errorMessage = language === 'zh'
      ? '抱歉，服务暂时不可用。请稍后重试。'
      : 'Sorry, service is temporarily unavailable. Please try again later.';
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      },
      body: JSON.stringify({
        reply: errorMessage,
        language,
        error: true
      })
    };
  }
}