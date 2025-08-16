
import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { PiggyBank, Briefcase, FileText, Share2, Copy, AlertCircle, Calculator, BookOpen, FileDown, RefreshCw } from 'lucide-react';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Seo from '@/components/Seo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormattedNumberInput from '@/components/ui/FormattedNumberInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

const TreasurySimulatorPage = () => {
  const { toast } = useToast();
  const [inputs, setInputs] = useState({
    annualRevenue: 1000000,
    annualExpenses: 700000,
    cashOnHand: 150000,
    revenueVolatility: 'medium',
    grossMargin: 55,
    runwayTargetMonths: 6,
    debtCapacity: true,
    riskAppetite: 60,
    treasuryObjective: 'hedge',
    isGaap: true,
  });

  const [calculationTrigger, setCalculationTrigger] = useState(0);

  const handleInputChange = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleRecalculate = () => {
    setCalculationTrigger(c => c + 1);
    toast({ title: "Success", description: "Report has been updated." });
  };

  const calculation = useMemo(() => {
    const monthlyExpenses = inputs.annualExpenses / 12;
    const minOperatingCash = monthlyExpenses * inputs.runwayTargetMonths;
    const excessCash = Math.max(inputs.cashOnHand - minOperatingCash, 0);
  
    // Invert volatility so LOW volatility raises score (safer biz → can allocate more)
    const volatilityScoreMap = { low: 30, medium: 20, high: 10 };
  
    // Objective still nudges risk up the spectrum
    const objectiveMap = { preserve: -5, hedge: 0, growth: 5, aggressive: 10 };
  
    // Re-signed weights (sum targets ~100 max), and CLAMP at the end
    let riskScore =
      (inputs.riskAppetite * 0.35) +                               // up to 35
      (volatilityScoreMap[inputs.revenueVolatility] * 1.0) +       // up to 30
      (Math.max(0, Math.min(inputs.grossMargin, 100)) * 0.20) +    // up to 20; higher margin → higher score
      (inputs.debtCapacity ? 10 : 0) +                              // +10 if capacity exists
      (objectiveMap[inputs.treasuryObjective]);                     // -5 to +10
  
    riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));
  
    // Tier mapping unchanged
    let allocationTier = 'Minimalist';
    let allocationPct = 0.07;
    if (riskScore >= 75) {
      allocationTier = 'Aggressive Growth'; allocationPct = 0.80;
    } else if (riskScore >= 50) {
      allocationTier = 'Backbone'; allocationPct = 0.35;
    } else if (riskScore >= 25) {
      allocationTier = 'Strategic Reserve'; allocationPct = 0.18;
    }
  
    const hasSufficientRunway = inputs.cashOnHand >= minOperatingCash;
    const btcAmountUsd = hasSufficientRunway
      ? Math.min(excessCash, inputs.cashOnHand * allocationPct)
      : 0;
  
    // Buy + custody plan
    let buyPlan, custodyPlan;
    if (!hasSufficientRunway) {
      buyPlan = `Stage-in via profit-sweep DCA once ${inputs.runwayTargetMonths}-month runway is fully funded.`;
      custodyPlan = "Hold 100% fiat until runway met; then transition to standard custody policy below.";
    } else if (riskScore >= 75) {
      buyPlan = "60% initial tranche, 40% DCA over 8 weeks.";
      custodyPlan = "90% cold storage (2-of-3 multisig), 10% hot buffer for ops.";
    } else if (riskScore >= 50) {
      buyPlan = "40% initial tranche, 60% DCA over 12 weeks.";
      custodyPlan = "80% cold storage (2-of-3 multisig), 20% hot buffer.";
    } else {
      buyPlan = "DCA weekly over 26 weeks.";
      custodyPlan = "70% cold storage (2-of-3 multisig), 30% hot buffer.";
    }
  
    // Accounting notes (updated GAAP)
    let accountingNote = inputs.isGaap
      ? 'US GAAP (ASU 2023-08): Crypto measured at fair value through net income; present separate line items; enhanced disclosures. Consult your CPA for adoption timing.'
      : 'IFRS: Often treated as intangible at cost less impairment; revaluation model may apply if active market evidence exists. Consult your auditor for policy selection.';
  
    if (inputs.debtCapacity && riskScore >= 75) {
      accountingNote += ' Advanced: consider secured debt for fiat runway while retaining BTC (board decision; treasury policy required).';
    }
  
    return {
      minOperatingCash,
      excessCash,
      riskScore,
      allocationTier,
      allocationPct,
      btcAmountUsd,
      buyPlan,
      custodyPlan,
      accountingNote,
      hasSufficientRunway
    };
  }, [inputs, calculationTrigger]);


  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

  const handleExport = useCallback((type) => {
    const { btcAmountUsd, allocationPct, buyPlan, custodyPlan, accountingNote } = calculation;
    const data = {
        'Recommended BTC Allocation (%)': (allocationPct * 100).toFixed(1),
        'Recommended BTC Allocation (USD)': formatCurrency(btcAmountUsd),
        'Buy Plan': buyPlan,
        'Custody Plan': custodyPlan,
        'Accounting Note': accountingNote
    };

    if (type === 'pdf') {
        const doc = new jsPDF();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text("Bitcoin Treasury Allocation Report", 10, 20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 10, 26);
        
        let y = 40;
        for (const [key, value] of Object.entries(data)) {
            doc.setFont('helvetica', 'bold');
            doc.text(key, 10, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            const splitValue = doc.splitTextToSize(value, 180);
            doc.text(splitValue, 10, y);
            y += (splitValue.length * 6) + 4;
        }

        doc.setFontSize(8);
        doc.text("Disclaimer: Not financial, legal, or tax advice. Educational only.", 10, y + 10);
        doc.save("treasury-report.pdf");
        toast({ title: "Success", description: "PDF report has been downloaded." });
    } else if (type === 'json') {
        navigator.clipboard.writeText(JSON.stringify({ inputs, results: data }, null, 2));
        toast({ title: "Copied!", description: "JSON data copied to clipboard." });
    } else if (type === 'link') {
        navigator.clipboard.writeText(window.location.href);
        toast({ title: "Copied!", description: "Shareable link copied to clipboard." });
    }
  }, [calculation, inputs, toast]);

  return (
    <>
      <Seo
        title="Bitcoin Treasury Allocation Simulator"
        description="A tool for founders and CFOs to simulate allocating a portion of their corporate treasury to Bitcoin, based on their unique financial situation and risk profile."
      />
      <div className="flex flex-col min-h-screen bg-black text-gray-200 font-mono">
        <Navigation />
        <main className="flex-grow pt-16">
          <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12 md:py-16 px-4"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bitcoin-text-gradient">Bitcoin Treasury Allocation Simulator</h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
              For founders & CFOs exploring a Bitcoin treasury strategy. Model your allocation based on your company's financials and risk profile.
            </p>
          </motion.header>

          <div className="container mx-auto px-4 pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <motion.div 
                className="lg:col-span-3"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="bg-gray-900/50 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center text-2xl bitcoin-text-gradient">
                        <Calculator className="mr-3 text-primary"/>
                        Input Your Company's Financials
                    </CardTitle>
                    <CardDescription>Adjust these values to match your company's profile.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="annualRevenue" className="text-white">Annual Revenue</Label>
                        <FormattedNumberInput id="annualRevenue" value={inputs.annualRevenue} onChange={(val) => handleInputChange('annualRevenue', val)} placeholder="e.g., 1,000,000" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="annualExpenses" className="text-white">Annual Expenses</Label>
                        <FormattedNumberInput id="annualExpenses" value={inputs.annualExpenses} onChange={(val) => handleInputChange('annualExpenses', val)} placeholder="e.g., 700,000" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cashOnHand" className="text-white">Cash on Hand</Label>
                        <FormattedNumberInput id="cashOnHand" value={inputs.cashOnHand} onChange={(val) => handleInputChange('cashOnHand', val)} placeholder="e.g., 150,000" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="grossMargin" className="text-white">Gross Margin %</Label>
                            <Input id="grossMargin" type="number" value={inputs.grossMargin} onChange={(e) => handleInputChange('grossMargin', Number(e.target.value))} placeholder="e.g., 55" className="text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="runwayTargetMonths" className="text-white">Runway Target (Months)</Label>
                            <Input id="runwayTargetMonths" type="number" value={inputs.runwayTargetMonths} onChange={(e) => handleInputChange('runwayTargetMonths', Number(e.target.value))} placeholder="e.g., 6" className="text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="revenueVolatility" className="text-white">Revenue Volatility</Label>
                            <Select value={inputs.revenueVolatility} onValueChange={(v) => handleInputChange('revenueVolatility', v)}>
                                <SelectTrigger className="text-white data-[placeholder]:text-gray-400"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="riskAppetite" className="text-white">Risk Appetite ({inputs.riskAppetite})</Label>
                        <Slider id="riskAppetite" value={[inputs.riskAppetite]} onValueChange={([v]) => handleInputChange('riskAppetite', v)} max={100} step={1} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="treasuryObjective" className="text-white">Treasury Objective</Label>
                        <Select value={inputs.treasuryObjective} onValueChange={(v) => handleInputChange('treasuryObjective', v)}>
                            <SelectTrigger className="text-white data-[placeholder]:text-gray-400"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="preserve">Preserve Capital</SelectItem>
                                <SelectItem value="hedge">Inflation Hedge</SelectItem>
                                <SelectItem value="growth">Growth</SelectItem>
                                <SelectItem value="aggressive">Aggressive Growth</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-2">
                            <Switch id="debtCapacity" checked={inputs.debtCapacity} onCheckedChange={(c) => handleInputChange('debtCapacity', c)} />
                            <Label htmlFor="debtCapacity" className="text-white">Has Debt Capacity</Label>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white">Accounting Standard</Label>
                          <RadioGroup
                            value={inputs.isGaap ? "gaap" : "ifrs"}
                            onValueChange={(v) => handleInputChange('isGaap', v === "gaap")}
                            className="flex items-center space-x-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="gaap" id="gaap" />
                              <Label htmlFor="gaap">US GAAP</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="ifrs" id="ifrs" />
                              <Label htmlFor="ifrs">IFRS</Label>
                            </div>
                          </RadioGroup>
                        </div>
                    </div>
                    <div className="pt-4">
                      <Button onClick={handleRecalculate} className="w-full bitcoin-gradient text-white hover:opacity-90 transition-opacity shadow-lg">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Recalculate & Update Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div 
                className="lg:col-span-2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="sticky top-24 bg-gray-900 border-primary/30 shadow-lg shadow-primary/10">
                   <CardHeader>
                    <CardTitle className="flex items-center text-2xl text-primary">
                        <FileText className="mr-3"/>
                        Allocation Report
                    </CardTitle>
                    <CardDescription>Your tailored Bitcoin treasury strategy.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-primary/10 p-6 rounded-lg text-center">
                        <Label>Recommended BTC Allocation</Label>
                        <p className="text-4xl font-bold text-primary mt-1">{formatCurrency(calculation.btcAmountUsd)}</p>
                        <p className="text-muted-foreground">
                          {calculation.btcAmountUsd === 0
                            ? `0.0% (runway not met; cap by excess cash thereafter)`
                            : `${(calculation.allocationPct * 100).toFixed(1)}% of cash on hand (capped by excess cash)`}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Label className="flex items-center"><PiggyBank className="w-4 h-4 mr-2" />Buy Plan</Label>
                        <p className="text-sm text-gray-300 p-3 bg-black/30 rounded-md">{calculation.buyPlan}</p>
                    </div>

                     <div className="space-y-1">
                        <Label className="flex items-center"><Briefcase className="w-4 h-4 mr-2" />Custody Plan</Label>
                        <p className="text-sm text-gray-300 p-3 bg-black/30 rounded-md">{calculation.custodyPlan}</p>
                    </div>
                    
                    <div className="space-y-1">
                        <Label className="flex items-center"><BookOpen className="w-4 h-4 mr-2" />Accounting Note</Label>
                        <p className="text-sm text-gray-300 p-3 bg-black/30 rounded-md">{calculation.accountingNote}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="text-center">
                            <Label>Calculated Risk Score</Label>
                            <p className="text-2xl font-bold bitcoin-text-gradient">{calculation.riskScore}</p>
                        </div>
                         <div className="text-center">
                            <Label>Allocation Tier</Label>
                            <p className="text-2xl font-bold bitcoin-text-gradient">{calculation.allocationTier}</p>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button onClick={() => handleExport('pdf')} className="w-full"><FileDown className="w-4 h-4 mr-2"/>Export PDF</Button>
                        <Button onClick={() => handleExport('json')} variant="outline" className="w-full"><Copy className="w-4 h-4 mr-2"/>Copy JSON</Button>
                        <Button onClick={() => handleExport('link')} variant="outline" className="w-full"><Share2 className="w-4 h-4 mr-2"/>Share</Button>
                    </div>

                  </CardContent>
                </Card>
              </motion.div>
            </div>
            
            <motion.div 
                className="mt-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Disclaimer</AlertTitle>
                    <AlertDescription>
                    This is not financial, legal, or tax advice. The content and tools provided are for educational and informational purposes only. You should not construe any such information as a recommendation to engage in any transaction.
                    </AlertDescription>
                </Alert>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default TreasurySimulatorPage;
