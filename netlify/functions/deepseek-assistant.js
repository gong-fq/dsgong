async function sendToAI() {
  if (isAILoading) return;
  
  const input = document.getElementById('aiInput');
  const message = input.value.trim();
  
  if (!message) {
    alert(currentLanguage === 'zh' ? '请输入问题' : 'Please enter a question');
    return;
  }

  // ... 之前的代码 ...

  try {
    // 检测语言
    const hasChinese = /[\u4e00-\u9fa5]/.test(message);
    const messageLanguage = hasChinese ? 'zh' : 'en';
    
    // 尝试调用Netlify Functions
    const response = await fetch('/.netlify/functions/deepseek-assistant', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        language: messageLanguage,
        timestamp: new Date().toISOString()
      })
    });
    
    console.log('API响应状态:', response.status);
    
    // 检查响应类型
    const contentType = response.headers.get('content-type');
    let responseData;
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      // 如果不是JSON，尝试读取文本
      const text = await response.text();
      console.error('非JSON响应:', text.substring(0, 200));
      
      // 如果是404，使用模拟回复作为备用方案
      if (response.status === 404) {
        console.log('使用模拟回复作为备用方案');
        responseData = await getMockAIResponse(message, messageLanguage);
      } else {
        throw new Error(`服务器返回了非JSON响应: ${response.status}`);
      }
    }
    
    if (responseData.error) {
      throw new Error(responseData.reply || 'AI服务返回错误');
    }
    
    if (responseData.reply) {
      currentResponse = responseData.reply;
      showAIResponse(responseData.reply, false);
    } else {
      throw new Error('No response from AI');
    }
    
  } catch (error) {
    console.error('AI请求失败:', error);
    
    // 尝试使用模拟回复
    try {
      console.log('尝试使用模拟回复');
      const hasChinese = /[\u4e00-\u9fa5]/.test(message);
      const messageLanguage = hasChinese ? 'zh' : 'en';
      const mockResponse = await getMockAIResponse(message, messageLanguage);
      currentResponse = mockResponse.reply;
      showAIResponse(mockResponse.reply, false);
    } catch (mockError) {
      console.error('模拟回复也失败:', mockError);
      
      // 显示错误信息
      let errorMessage;
      if (error.message.includes('Failed to fetch')) {
        errorMessage = currentLanguage === 'zh'
          ? '网络连接失败。请检查网络连接。'
          : 'Network connection failed. Please check your connection.';
      } else if (error.message.includes('404')) {
        errorMessage = currentLanguage === 'zh'
          ? 'API端点未找到。显示模拟回复。'
          : 'API endpoint not found. Showing mock response.';
      } else {
        errorMessage = currentLanguage === 'zh'
          ? `请求失败：${error.message}`
          : `Request failed: ${error.message}`;
      }
      
      showAIResponse(errorMessage, true);
    }
  } finally {
    isAILoading = false;
    resetUIState();
  }
}

// 模拟AI回复函数
async function getMockAIResponse(message, language) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockResponses = {
        zh: {
          '什么是大语言模型': '大语言模型（LLM）是基于深度学习的人工智能系统，通过大量文本数据训练，能够理解、生成和推理自然语言。它们是自然语言处理领域的重大突破。',
          'deepseek': 'DeepSeek是一款先进的大语言模型，具有强大的理解和生成能力，支持多种语言和编程任务。',
          'transformer': 'Transformer是一种基于注意力机制的神经网络架构，是目前大多数大语言模型的基础。',
          'token': 'Token是文本处理的基本单元，可以是一个字、一个词或一个子词。',
          'default': '这是一个模拟回复，因为AI服务暂时不可用。实际部署时请配置DeepSeek API密钥。'
        },
        en: {
          'what is large language model': 'Large Language Models (LLMs) are AI systems based on deep learning, trained on massive text data to understand, generate, and reason with natural language.',
          'deepseek': 'DeepSeek is an advanced large language model with powerful comprehension and generation capabilities, supporting multiple languages and programming tasks.',
          'transformer': 'Transformer is a neural network architecture based on attention mechanism, serving as the foundation for most modern large language models.',
          'token': 'Token is the basic unit of text processing, which can be a character, word, or subword.',
          'default': 'This is a mock response as AI service is temporarily unavailable. Please configure DeepSeek API key for actual deployment.'
        }
      };
      
      const lowerMessage = message.toLowerCase();
      let reply = language === 'zh' ? mockResponses.zh.default : mockResponses.en.default;
      
      // 查找匹配的回复
      for (const [key, value] of Object.entries(mockResponses[language])) {
        if (lowerMessage.includes(key)) {
          reply = value;
          break;
        }
      }
      
      resolve({
        error: false,
        reply: reply
      });
    }, 1000); // 模拟延迟
  });
}