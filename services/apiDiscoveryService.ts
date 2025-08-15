// services/apiDiscoveryService.ts - Descoberta Sistemática da API ComexStat Real
const API_BASE = 'https://api-comexstat.mdic.gov.br';

interface TestResult {
  endpoint: string;
  parameters: any;
  success: boolean;
  data?: any;
  error?: string;
  dataStructure?: string;
  itemCount?: number;
  sampleData?: any;
}

interface DiscoveryResult {
  ncmEndpoint: TestResult | null;
  empresaEndpoint: TestResult | null;
  workingParameters: {
    ncm: any;
    empresa: any;
  };
  allTests: TestResult[];
}

class APIDiscoveryService {
  private delay = 4000; // 4 segundos entre requests para evitar rate limit

  private async makeRequest(endpoint: string, payload: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, this.delay));
    
    console.log(`🔍 Testando: ${endpoint}`, payload);
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ComexStat-Discovery/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  }

  private analyzeDataStructure(data: any): string {
    if (!data) return 'null/undefined';
    
    if (Array.isArray(data)) {
      return `Array[${data.length}]`;
    }
    
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      const structure = keys.map(key => {
        const value = data[key];
        if (Array.isArray(value)) {
          return `${key}: Array[${value.length}]`;
        }
        return `${key}: ${typeof value}`;
      }).join(', ');
      
      return `Object{${structure}}`;
    }
    
    return typeof data;
  }

  // ✅ DESCOBERTA SISTEMÁTICA DE ENDPOINTS NCM
  async discoverNCMEndpoints(flow: 'export' | 'import' = 'export'): Promise<TestResult[]> {
    console.log('🔍 === DESCOBERTA SISTEMÁTICA NCM ===');
    
    const testPeriod = { from: '2022-01', to: '2022-12' };
    const results: TestResult[] = [];

    // Testar diferentes combinações de parâmetros para NCM
    const testConfigurations = [
      // Teste 1: Sem details (dados agregados)
      {
        name: 'Dados Agregados',
        payload: {
          flow,
          monthDetail: false,
          period: testPeriod,
          metrics: ['metricFOB', 'metricKG']
        }
      },
      
      // Teste 2: Com details NCM
      {
        name: 'Details NCM',
        payload: {
          flow,
          monthDetail: false,
          period: testPeriod,
          details: ['ncm'],
          metrics: ['metricFOB', 'metricKG']
        }
      },
      
      // Teste 3: Com details SH
      {
        name: 'Details SH',
        payload: {
          flow,
          monthDetail: false,
          period: testPeriod,
          details: ['sh'],
          metrics: ['metricFOB', 'metricKG']
        }
      },
      
      // Teste 4: Com details SH4
      {
        name: 'Details SH4',
        payload: {
          flow,
          monthDetail: false,
          period: testPeriod,
          details: ['sh4'],
          metrics: ['metricFOB', 'metricKG']
        }
      },
      
      // Teste 5: Com details SH2
      {
        name: 'Details SH2',
        payload: {
          flow,
          monthDetail: false,
          period: testPeriod,
          details: ['sh2'],
          metrics: ['metricFOB', 'metricKG']
        }
      },
      
      // Teste 6: Múltiplos details
      {
        name: 'Multiple Details',
        payload: {
          flow,
          monthDetail: false,
          period: testPeriod,
          details: ['ncm', 'pais'],
          metrics: ['metricFOB', 'metricKG']
        }
      },
      
      // Teste 7: Com filtros específicos
      {
        name: 'Com Filtros',
        payload: {
          flow,
          monthDetail: false,
          period: testPeriod,
          details: ['ncm'],
          filters: [
            {
              filter: 'sh2',
              values: ['01', '02', '03'] // Primeiros capítulos SH
            }
          ],
          metrics: ['metricFOB', 'metricKG']
        }
      }
    ];

    // Executar todos os testes
    for (const config of testConfigurations) {
      try {
        const data = await this.makeRequest('/general?language=pt', config.payload);
        
        const result: TestResult = {
          endpoint: '/general',
          parameters: config.payload,
          success: true,
          data,
          dataStructure: this.analyzeDataStructure(data.data),
          itemCount: data.data?.list?.length || 0,
          sampleData: data.data?.list?.slice(0, 2) || null
        };
        
        console.log(`✅ ${config.name}: ${result.itemCount} itens encontrados`);
        results.push(result);
        
      } catch (error: any) {
        const result: TestResult = {
          endpoint: '/general',
          parameters: config.payload,
          success: false,
          error: error.message
        };
        
        console.log(`❌ ${config.name}: ${error.message}`);
        results.push(result);
      }
    }

    return results;
  }

  // ✅ DESCOBERTA SISTEMÁTICA DE ENDPOINTS EMPRESA
  async discoverEmpresaEndpoints(flow: 'export' | 'import' = 'export'): Promise<TestResult[]> {
    console.log('🔍 === DESCOBERTA SISTEMÁTICA EMPRESAS ===');
    
    const testPeriod = { from: '2022-01', to: '2022-12' };
    const results: TestResult[] = [];

    const testConfigurations = [
      // Teste 1: Details empresa
      {
        name: 'Details Empresa',
        payload: {
          flow,
          monthDetail: false,
          period: testPeriod,
          details: ['empresa'],
          metrics: ['metricFOB', 'metricKG']
        }
      },
      
      // Teste 2: Details importador/exportador
      {
        name: 'Details Importador',
        payload: {
          flow,
          monthDetail: false,
          period: testPeriod,
          details: [flow === 'import' ? 'importador' : 'exportador'],
          metrics: ['metricFOB', 'metricKG']
        }
      },
      
      // Teste 3: Details cnpj
      {
        name: 'Details CNPJ',
        payload: {
          flow,
          monthDetail: false,
          period: testPeriod,
          details: ['cnpj'],
          metrics: ['metricFOB', 'metricKG']
        }
      },
      
      // Teste 4: Details uf (por estado)
      {
        name: 'Details UF',
        payload: {
          flow,
          monthDetail: false,
          period: testPeriod,
          details: ['uf'],
          metrics: ['metricFOB', 'metricKG']
        }
      },
      
      // Teste 5: Múltiplos details com empresa
      {
        name: 'Empresa + UF',
        payload: {
          flow,
          monthDetail: false,
          period: testPeriod,
          details: ['empresa', 'uf'],
          metrics: ['metricFOB', 'metricKG']
        }
      },
      
      // Teste 6: Com filtros de UF específicas
      {
        name: 'Filtro UF SP/RJ',
        payload: {
          flow,
          monthDetail: false,
          period: testPeriod,
          details: ['uf'],
          filters: [
            {
              filter: 'uf',
              values: ['SP', 'RJ', 'MG'] // Estados principais
            }
          ],
          metrics: ['metricFOB', 'metricKG']
        }
      }
    ];

    // Executar todos os testes
    for (const config of testConfigurations) {
      try {
        const data = await this.makeRequest('/general?language=pt', config.payload);
        
        const result: TestResult = {
          endpoint: '/general',
          parameters: config.payload,
          success: true,
          data,
          dataStructure: this.analyzeDataStructure(data.data),
          itemCount: data.data?.list?.length || 0,
          sampleData: data.data?.list?.slice(0, 2) || null
        };
        
        console.log(`✅ ${config.name}: ${result.itemCount} itens encontrados`);
        results.push(result);
        
      } catch (error: any) {
        const result: TestResult = {
          endpoint: '/general',
          parameters: config.payload,
          success: false,
          error: error.message
        };
        
        console.log(`❌ ${config.name}: ${error.message}`);
        results.push(result);
      }
    }

    return results;
  }

  // ✅ DESCOBERTA COMPLETA
  async discoverWorkingEndpoints(flow: 'export' | 'import' = 'export'): Promise<DiscoveryResult> {
    console.log('🚀 === DESCOBERTA COMPLETA DA API COMEXSTAT ===');
    
    // Testar endpoints auxiliares primeiro
    await this.testAuxiliaryEndpoints();
    
    // Descobrir NCM
    const ncmTests = await this.discoverNCMEndpoints(flow);
    const workingNCM = ncmTests.find(test => 
      test.success && 
      test.itemCount && 
      test.itemCount > 0 &&
      test.sampleData &&
      this.hasNCMData(test.sampleData)
    );

    // Descobrir Empresas
    const empresaTests = await this.discoverEmpresaEndpoints(flow);
    const workingEmpresa = empresaTests.find(test => 
      test.success && 
      test.itemCount && 
      test.itemCount > 0 &&
      test.sampleData &&
      this.hasEmpresaData(test.sampleData)
    );

    const result: DiscoveryResult = {
      ncmEndpoint: workingNCM || null,
      empresaEndpoint: workingEmpresa || null,
      workingParameters: {
        ncm: workingNCM?.parameters || null,
        empresa: workingEmpresa?.parameters || null
      },
      allTests: [...ncmTests, ...empresaTests]
    };

    // Log final
    console.log('🎯 === RESULTADO FINAL ===');
    console.log('NCM funcionando:', !!workingNCM);
    console.log('Empresa funcionando:', !!workingEmpresa);
    
    if (workingNCM) {
      console.log('✅ Parâmetros NCM que funcionam:', workingNCM.parameters);
    }
    
    if (workingEmpresa) {
      console.log('✅ Parâmetros Empresa que funcionam:', workingEmpresa.parameters);
    }

    return result;
  }

  // ✅ TESTAR ENDPOINTS AUXILIARES
  private async testAuxiliaryEndpoints(): Promise<void> {
    console.log('🔍 Testando endpoints auxiliares...');
    
    const auxiliaryTests = [
      { name: 'Filtros', endpoint: '/general/filters?language=pt', method: 'GET' },
      { name: 'Detalhes', endpoint: '/general/details?language=pt', method: 'GET' },
      { name: 'Métricas', endpoint: '/general/metrics?language=pt', method: 'GET' },
      { name: 'Anos', endpoint: '/general/dates/years', method: 'GET' }
    ];

    for (const test of auxiliaryTests) {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const response = await fetch(`${API_BASE}${test.endpoint}`, {
          method: test.method,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ComexStat-Discovery/1.0'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${test.name}:`, Object.keys(data).join(', '));
        } else {
          console.log(`❌ ${test.name}: HTTP ${response.status}`);
        }
        
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }
  }

  // ✅ VERIFICAR SE DADOS TÊM INFORMAÇÕES NCM
  private hasNCMData(sampleData: any[]): boolean {
    if (!Array.isArray(sampleData) || sampleData.length === 0) return false;
    
    const firstItem = sampleData[0];
    const ncmFields = ['ncm', 'coNcm', 'CO_NCM', 'noNcm', 'sh4', 'sh2', 'codigo'];
    
    return ncmFields.some(field => firstItem[field] !== undefined);
  }

  // ✅ VERIFICAR SE DADOS TÊM INFORMAÇÕES DE EMPRESA
  private hasEmpresaData(sampleData: any[]): boolean {
    if (!Array.isArray(sampleData) || sampleData.length === 0) return false;
    
    const firstItem = sampleData[0];
    const empresaFields = ['empresa', 'cnpj', 'coCnpj', 'razaoSocial', 'noEmpresa', 'importador', 'exportador'];
    
    return empresaFields.some(field => firstItem[field] !== undefined);
  }

  // ✅ EXPORTAR RESULTADOS
  exportResults(results: DiscoveryResult): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        ncmWorking: !!results.ncmEndpoint,
        empresaWorking: !!results.empresaEndpoint,
        totalTests: results.allTests.length,
        successfulTests: results.allTests.filter(t => t.success).length
      },
      workingParameters: results.workingParameters,
      allTests: results.allTests.map(test => ({
        endpoint: test.endpoint,
        success: test.success,
        itemCount: test.itemCount,
        error: test.error,
        parameters: test.parameters
      }))
    }, null, 2);
  }
}

export const apiDiscoveryService = new APIDiscoveryService();