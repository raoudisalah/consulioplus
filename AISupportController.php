<?php

namespace App\Http\Controllers;

use App\Http\Controllers\FrontEnd\MiscellaneousController;
use Illuminate\Http\Request;
use OpenAI;

class AISupportController extends Controller
{
    protected $ai_client;

    public function __construct()
    {
        $this->ai_client = OpenAI::client(config('services.openai.api_key'));
    }

    public function user()
    {

        $misc = new MiscellaneousController();

        $language = $misc->getLanguage();

        $queryResult['pageHeading'] = $misc->getPageHeading($language);

        $queryResult['bgImg'] = $misc->getBreadcrumb();
        return view('frontend.user.ai-support', $queryResult);
    }

    public function vendor()
    {
        $misc = new MiscellaneousController();

        $language = $misc->getLanguage();

        $queryResult['pageHeading'] = $misc->getPageHeading($language);

        $queryResult['bgImg'] = $misc->getBreadcrumb();

        return view('vendors.ai-support', $queryResult);
    }

    public function askAI(Request $request) {
        $request->validate([
            'prompt' => 'required|string',
        ]);

        $userPrompt = $request->input('prompt');
        $aiResponse = $this->ai_client->chat()->create([
            'model' => 'gpt-3.5-turbo', // or another model
            'messages' => [
                ['role' => 'system', 'content' => 'You are the good AI support.'],
                ['role' => 'user', 'content' => "$userPrompt"],
            ],
        ]);

        return response()->json([
            'message' => $aiResponse['choices'][0]['message']['content'],
        ]);
    }

    public function getAssist(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
        ]);

        $userMessage = $request->input('message');
        $aiResponse = $this->ai_client->chat()->create([
            'model' => 'gpt-3.5-turbo', // or another model
            'messages' => [
                ['role' => 'system', 'content' => 'Improve the provided message.'],
                ['role' => 'user', 'content' => "Improve the content as human readable content in Italian: $userMessage"],
            ],
        ]);

        return response()->json([
            'message' => $aiResponse['choices'][0]['message']['content'],
        ]);
    }

    public function getSummarize(Request $request)
    {
        $request->validate([
            'messages' => 'required|string',
        ]);

        $messages = $request->input('messages');
        $aiResponse = $this->ai_client->chat()->create([
            'model' => 'gpt-3.5-turbo', // or another model
            'messages' => [
                ['role' => 'system', 'content' => 'You are an AI assistant. Your task is to summarize the following chat history between a vendor and a customer in a concise, clear, and professional manner.'],
                ['role' => 'user', 'content' => "Please provide a summary of the conversation in Italian: $messages"],
            ],
        ]);

        return response()->json([
            'message' => $aiResponse['choices'][0]['message']['content'],
        ]);
    }
}
